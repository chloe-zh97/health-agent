from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Health AI Agent")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Will restrict after deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.health_agent

# Gemini setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-2.5-flash')

# Pydantic models
class HealthCondition(BaseModel):
    condition: str
    severity: int  # 1-10
    notes: Optional[str] = None
    timestamp: datetime = datetime.now()

class DiaryEntry(BaseModel):
    date: str
    meals: List[str]
    conditions: List[HealthCondition]
    activities: Optional[List[str]] = []
    notes: Optional[str] = None

class UserProfile(BaseModel):
    user_id: str
    age: int
    gender: str
    weight: Optional[float] = None
    height: Optional[float] = None
    allergies: Optional[List[str]] = []
    medical_conditions: Optional[List[str]] = []

# API Routes
@app.post("/api/auth/register")
async def register_user(profile: UserProfile):
    existing = await db.users.find_one({"user_id": profile.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    result = await db.users.insert_one(profile.dict())
    return {"message": "User registered successfully", "user_id": profile.user_id}

@app.post("/api/auth/login")
async def login_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return {"message": "Login successful", "user": user}

@app.post("/api/users")
async def create_user(profile: UserProfile):
    existing = await db.users.find_one({"user_id": profile.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    result = await db.users.insert_one(profile.dict())
    return {"message": "User created", "id": str(result.inserted_id)}

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return user

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, profile: UserProfile):
    existing = await db.users.find_one({"user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = profile.dict(exclude={"user_id"})
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No changes made")
    
    return {"message": "User updated successfully"}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user and all related data
    await db.users.delete_one({"user_id": user_id})
    await db.diary.delete_many({"user_id": user_id})
    await db.recommendations.delete_many({"user_id": user_id})
    
    return {"message": "User and all related data deleted successfully"}

@app.post("/api/diary/{user_id}")
async def add_diary_entry(user_id: str, entry: DiaryEntry):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    entry_dict = entry.dict()
    entry_dict["user_id"] = user_id
    entry_dict["created_at"] = datetime.now()
    
    result = await db.diary.insert_one(entry_dict)
    return {"message": "Diary entry added", "id": str(result.inserted_id)}

@app.get("/api/diary/{user_id}")
async def get_diary_entries(user_id: str, limit: int = 10):
    entries = []
    cursor = db.diary.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        entries.append(doc)
    return entries

@app.post("/api/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    # Get user profile
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get recent diary entries
    entries = []
    cursor = db.diary.find({"user_id": user_id}).sort("created_at", -1).limit(7)
    async for doc in cursor:
        entries.append(doc)
    
    # Build context for Claude
    context = f"""
User Profile:
- Age: {user.get('age')}
- Gender: {user.get('gender')}
- Weight: {user.get('weight')} kg
- Height: {user.get('height')} cm
- Allergies: {', '.join(user.get('allergies', []))}
- Medical Conditions: {', '.join(user.get('medical_conditions', []))}

Recent Health Data (Last 7 days):
"""
    
    for entry in entries:
        context += f"\nDate: {entry.get('date')}\n"
        context += f"Meals: {', '.join(entry.get('meals', []))}\n"
        context += "Health Conditions:\n"
        for cond in entry.get('conditions', []):
            context += f"  - {cond['condition']} (Severity: {cond['severity']}/10)\n"
        context += f"Activities: {', '.join(entry.get('activities', []))}\n"
    
    # Get AI recommendations from Gemini
    prompt = f"""{context}

Based on this health data, please provide:
1. Daily menu recommendations (breakfast, lunch, dinner, snacks)
2. Physical activity suggestions
3. Health insights and patterns you notice
4. Specific recommendations to address recurring health issues

Format the response in JSON with these keys: menu, exercise, insights, recommendations"""
    
    try:
        response = gemini_model.generate_content(prompt)
        response_text = response.text
        
        # Try to parse and format JSON response
        formatted_text = response_text
        try:
            # Remove markdown code blocks if present
            clean_json = response_text.strip()
            clean_json = clean_json.replace('```json\n', '').replace('```\n', '').replace('```', '')
            parsed = json.loads(clean_json)
            
            # Format the JSON into readable text
            formatted_parts = []
            
            # Menu section
            if 'menu' in parsed:
                formatted_parts.append("=" * 60)
                formatted_parts.append("📋 DAILY MENU PLAN")
                formatted_parts.append("=" * 60)
                menu = parsed['menu']
                if 'breakfast' in menu:
                    formatted_parts.append(f"\n☕ Breakfast:\n{menu['breakfast']}")
                if 'lunch' in menu:
                    formatted_parts.append(f"\n☀️ Lunch:\n{menu['lunch']}")
                if 'dinner' in menu:
                    formatted_parts.append(f"\n🌙 Dinner:\n{menu['dinner']}")
                if 'snacks' in menu:
                    formatted_parts.append(f"\n🍎 Snacks:")
                    if isinstance(menu['snacks'], list):
                        for snack in menu['snacks']:
                            formatted_parts.append(f"  • {snack}")
                    else:
                        formatted_parts.append(f"  {menu['snacks']}")
            
            # Exercise section
            if 'exercise' in parsed:
                formatted_parts.append("\n" + "=" * 60)
                formatted_parts.append("💪 EXERCISE RECOMMENDATIONS")
                formatted_parts.append("=" * 60)
                for key, value in parsed['exercise'].items():
                    formatted_parts.append(f"\n{key.replace('_', ' ').title()}:")
                    formatted_parts.append(f"{value}")
            
            # Insights section
            if 'insights' in parsed:
                formatted_parts.append("\n" + "=" * 60)
                formatted_parts.append("💡 HEALTH INSIGHTS")
                formatted_parts.append("=" * 60)
                for idx, insight in enumerate(parsed['insights'], 1):
                    if isinstance(insight, dict):
                        formatted_parts.append(f"\n{idx}. {insight.get('finding', f'Insight {idx}')}")
                        formatted_parts.append(f"   {insight.get('explanation', '')}")
                    else:
                        formatted_parts.append(f"\n{idx}. {insight}")
            
            # Recommendations section
            if 'recommendations' in parsed:
                formatted_parts.append("\n" + "=" * 60)
                formatted_parts.append("⚠️ ACTION RECOMMENDATIONS")
                formatted_parts.append("=" * 60)
                for idx, rec in enumerate(parsed['recommendations'], 1):
                    if isinstance(rec, dict):
                        formatted_parts.append(f"\n{idx}. {rec.get('area', f'Recommendation {idx}')}")
                        formatted_parts.append(f"   {rec.get('suggestion', '')}")
                    else:
                        formatted_parts.append(f"\n{idx}. {rec}")
            
            formatted_text = "\n".join(formatted_parts)
        except json.JSONDecodeError:
            # If JSON parsing fails, keep original text
            pass
        
        # Store recommendation
        await db.recommendations.insert_one({
            "user_id": user_id,
            "recommendation": formatted_text,
            "created_at": datetime.now()
        })
        
        return {"recommendation": formatted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@app.get("/api/recommendations/{user_id}/history")
async def get_recommendation_history(user_id: str, limit: int = 5):
    recommendations = []
    cursor = db.recommendations.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        recommendations.append(doc)
    return recommendations

@app.get("/")
async def root():
    return {"message": "Health AI Agent API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
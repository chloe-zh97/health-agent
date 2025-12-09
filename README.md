# Health AI Agent
An intelligent personal health management system powered by Google Gemini AI.

Demo: https://health-agent-frontend-nuk2.onrender.com/

## Screenshots
### Login & Registration
Simple authentication with username - Register new users or login to existing accounts.
![alt text](/doc/image.png)


![alt text](/doc/image2.png)

### User Profile Management
View and edit your health profile including age, weight, height, allergies, and medical conditions
![alt text](/doc/image3.png)


### Daily Health Diary
Track meals, health conditions with severity ratings, physical activities, and notes.
![alt text](/doc/image4.png)

### AI-Powered Recommendations
Get personalized menu plans, exercise suggestions, health insights, and actionable advice from Gemini AI.
![alt text](image5.png)
## Key Features
### 🔐 User Authentication

Simple username-based login system
Secure user registration with profile creation
Session management with logout functionality

### 👤 Profile Management

Comprehensive health profile (age, gender, weight, height)
Track allergies and medical conditions
Editable profile with save/cancel options

### 📝 Health Diary

Daily entry logging with date stamps
Multi-meal tracking per day
Health symptom recording with severity scale (1-10)
Physical activity logging
Additional notes for context

### 🤖 AI-Powered Insights

Personalized Menu Plans - Breakfast, lunch, dinner, and snack recommendations
Exercise Programs - Aerobic, strength training, and flexibility suggestions
Health Pattern Recognition - AI identifies correlations in your data
Actionable Recommendations - Specific advice for recurring health issues

### 🎨 Modern UI/UX

Responsive design for all devices
Beautiful gradient backgrounds and card layouts
Intuitive three-tab navigation
Real-time loading states and feedback

## 🏗️ System Architecture
**High-Level Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Login/    │  │   Profile   │  │  Diary & AI Recs    │ │
│  │  Register   │  │ Management  │  │    Interface        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │     Auth     │  │    User &    │  │   AI Service     │  │
│  │   Endpoints  │  │    Diary     │  │   (Gemini API)   │  │
│  │              │  │   Endpoints  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ Motor (Async Driver)
                         ▼
                 ┌───────────────┐
                 │   MongoDB     │
                 │  (Database)   │
                 └───────────────┘
                         │
                 ┌───────┴────────┐
                 ▼                ▼
          ┌──────────┐    ┌──────────────┐
          │  Users   │    │    Diary     │
          └──────────┘    └──────────────┘
                                  │
                          ┌───────┴──────────┐
                          │  Recommendations │
                          └──────────────────┘
```

### Technology Stack
**Backend**
- Framework: FastAPI (Python) - High-performance async web framework
- Database: MongoDB - NoSQL database for flexible schema
- Database Driver: Motor - Async MongoDB driver
- AI Integration: Google Gemini 1.5 Flash API
- Server: Uvicorn - ASGI server

**Frontend**

- Framework: React 18+ with Hooks
- Styling: Tailwind CSS - Utility-first CSS framework
- Icons: Lucide React
- HTTP Client: Fetch API

**Development Tools**

- API Testing: FastAPI automatic docs (Swagger UI)
- Package Management: pip (Python), npm (JavaScript)
- Environment: python-dotenv for configuration


## 🗄️ Database Schema
**Users Collection**
```javascript
{
  _id: ObjectId,
  user_id: String (unique, indexed),
  age: Integer,
  gender: String ["male", "female", "other"],
  weight: Float,  // in kg
  height: Float,  // in cm
  allergies: Array[String],
  medical_conditions: Array[String]
}
```
**Diary Collection**
```javascript
{
  _id: ObjectId,
  user_id: String (foreign key, indexed),
  date: String (YYYY-MM-DD),
  meals: Array[String],
  conditions: Array[{
    condition: String,
    severity: Integer (1-10),
    notes: String,
    timestamp: DateTime
  }],
  activities: Array[String],
  notes: String,
  created_at: DateTime
}
```
**Recommendations Collection**
```javascript
{
  _id: ObjectId,
  user_id: String (foreign key, indexed),
  recommendation: String (formatted text),
  created_at: DateTime
}
```

## 🔌 API Documentation
### Authentication Endpoints
**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "user_id": "john_doe",
  "age": 25,
  "gender": "male",
  "weight": 70.5,
  "height": 175,
  "allergies": ["peanuts", "gluten"],
  "medical_conditions": ["diabetes"]
}

Response: 200 OK
{
  "message": "User registered successfully",
  "user_id": "john_doe"
}
```

**Login User**
```http
POST /api/auth/login?user_id=john_doe

Response: 200 OK
{
  "message": "Login successful",
  "user": { ...user_profile }
}
```

### User Management Endpoints
**Get User Profile**
```http
GET /api/users/{user_id}

Response: 200 OK
{ ...user_profile }
```

**Update User Profile**
```http
PUT /api/users/{user_id}
Content-Type: application/json

{ ...updated_profile }

Response: 200 OK
{ "message": "User updated successfully" }
```

### Diary Endpoints
**Create Diary Entry**
```http
POST /api/diary/{user_id}
Content-Type: application/json

{
  "date": "2024-12-01",
  "meals": ["oatmeal", "salad", "grilled chicken"],
  "conditions": [{
    "condition": "headache",
    "severity": 6,
    "notes": "After lunch"
  }],
  "activities": ["running", "yoga"],
  "notes": "Felt energetic today"
}

Response: 200 OK
{ "message": "Diary entry added", "id": "..." }
```

**Get Diary Entries**
```http
GET /api/diary/{user_id}?limit=10

Response: 200 OK
[ ...array_of_entries ]
```
### Recommendation Endpoints
**Generate Recommendations**
```http
POST /api/recommendations/{user_id}

Response: 200 OK
{
  "recommendation": "=== DAILY MENU PLAN ===\n..."
}
```
**Get Recommendation History**
```http
GET /api/recommendations/{user_id}/history?limit=5

Response: 200 OK
[ ...array_of_recommendations ]
```

## 📁 Project Structure
```
health-ai-agent/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (not in git)
│   └── .env.example         # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML template
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── index.js         # React entry point
│   │   └── index.css        # Tailwind CSS imports
│   ├── package.json         # Node dependencies
│   └── tailwind.config.js   # Tailwind configuration
├── screenshots/             # Application screenshots
│   ├── login.png
│   ├── profile.png
│   ├── diary.png
│   └── recommendations.png
├── README.md                # This file
└── LICENSE                  # MIT License
```

## 🚀 Getting Started
**Prerequisites**
- Python 3.8 or higher
- Node.js 16.x or higher
- Google Gemini API key

**Run the Application**
```bash
# Terminal 1 - Start Backend
cd backend
python main.py
# Backend runs on http://localhost:8000

# Terminal 2 - Start Frontend
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

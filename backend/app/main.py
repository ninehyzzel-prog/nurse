from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import auth, staff, shift, policy, request, schedule, fairness

app = FastAPI(
    title="산부인과 병동 근무 스케줄러 API",
    description="OR-Tools CP-SAT 제약 최적화 및 투명 점수제 기반 병동 스케줄링 백엔드 API",
    version="1.0.0",
)

# CORS 설정 (Vite 프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(shift.router)
app.include_router(policy.router)
app.include_router(request.router)
app.include_router(schedule.router)
app.include_router(fairness.router)


@app.get("/")
def root():
    return {
        "service": "OBGYN Nurse Scheduler API",
        "status": "healthy",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# .env 파일에 숨겨둔 비밀 정보(데이터베이스 주소와 비밀번호)를 불러옵니다.
load_dotenv()

# MySQL 창고 주소 (기본값 설정)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:1234@localhost:3306/ai_meeting")

# 창고와 연결하는 엔진(모터)을 만듭니다.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 창고에 물건을 넣고 뺄 때 사용할 '작업 세션(Session)'을 만드는 공장입니다.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 앞으로 만들 모든 데이터 설계도(모델)의 기본 바탕이 되는 클래스입니다.
Base = declarative_base()

# 창고 문을 열고 닫는 함수 (서버가 요청을 받을 때마다 사용해요)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

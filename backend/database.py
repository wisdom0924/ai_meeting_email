from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

# .env 파일에 숨겨둔 비밀 정보(데이터베이스 주소와 비밀번호)를 불러옵니다.
load_dotenv()


def get_database_url() -> str:
    """MySQL 연결 URL. 비밀번호에 @, ! 등 특수문자가 있어도 안전하게 처리."""
    if os.getenv("MYSQL_HOST"):
        user = os.getenv("MYSQL_USER", "root")
        password = quote_plus(os.getenv("MYSQL_ROOT_PASSWORD", "1234"))
        host = os.getenv("MYSQL_HOST", "localhost")
        port = os.getenv("MYSQL_PORT", "3306")
        database = os.getenv("MYSQL_DATABASE", "ai_meeting")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    return os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:1234@localhost:3306/ai_meeting",
    )


# MySQL 창고 주소 (기본값 설정)
SQLALCHEMY_DATABASE_URL = get_database_url()

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

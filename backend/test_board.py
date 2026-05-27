import sys
sys.path.insert(0, '.')
from database import SessionLocal
import models

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == "test@test.com").first()
if user:
    user.is_active = True
    db.commit()
db.close()

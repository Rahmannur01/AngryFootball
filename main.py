from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/", StaticFiles(directory="public", html=True))

@app.get("/")
def root():
    return {"message" : "Hello world"} 
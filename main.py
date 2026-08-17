from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/static", StaticFiles(directory="public", html=True), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/game/index.html")
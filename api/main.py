from flask import Flask

app = Flask(__name__)


@app.route("/")
def home():
    return {"Model API is Active :)"}

@app.route("/health")
def health():
    return {"Health: 400"}






if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9777)
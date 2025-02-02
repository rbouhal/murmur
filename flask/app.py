import io
import os
import json
import gc  # Garbage collection for freeing memory
from flask import Flask, request, jsonify, Response
from flask_cors import CORS  # Import CORS
import vosk
import wave
from scipy.spatial.distance import cosine
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage

load_dotenv()
app = Flask(__name__)

# Allow requests ONLY from a specific IP and port
ALLOWED_ORIGIN = "http://" + os.environ.get('IP_ADDRESS') + ":8081"
# Configure CORS to restrict access
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGIN}})

# Paths to your Vosk models
MODEL_PATH = "models/vosk/vosk-model-en-us-0.22"
SPK_MODEL_PATH = "models/vosk/vosk-model-spk-0.4"

EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS')
APP_PASSWORD = os.environ.get('APP_PASSWORD')
CARRIER_GATEWAYS = [
    "vtext.com", # Verizon
    "@myvzw.com",
    "txt.att.net", # AT&T
    "mms.att.net",
    "tmomail.net",  # T-Mobile
    "@email.uscc.net", # USC
    "@uscc.textmsg.com",
    "@sprintpaging.com" # Sprint
]

# Global model references
model = None
speaker_model = None
global_speaker_vector = None  # Global variable to store speaker vector

def load_models():
    """Loads the Vosk models into memory on demand."""
    global model, speaker_model

    if model is None:
        if not os.path.exists(MODEL_PATH):
            return False, "Vosk model not found."
        model = vosk.Model(MODEL_PATH)

    if speaker_model is None:
        if not os.path.exists(SPK_MODEL_PATH):
            return False, "Speaker model not found."
        speaker_model = vosk.SpkModel(SPK_MODEL_PATH)

    return True, "Models loaded successfully."

def unload_models():
    """Unloads the Vosk models to free memory."""
    global model, speaker_model
    model = None
    speaker_model = None
    gc.collect()  # Manually trigger garbage collection
    return True, "Models unloaded successfully."

def extract_speaker_vector_from_wav_bytes(wav_bytes: bytes):
    """Extract a speaker vector from in-memory WAV bytes (16kHz, mono)."""
    if model is None or speaker_model is None:
        raise RuntimeError("Models are not loaded. Call /load-models first.")

    with wave.open(io.BytesIO(wav_bytes), 'rb') as wf:
        if wf.getnchannels() != 1 or wf.getframerate() != 16000:
            raise ValueError("Audio must be mono and 16 kHz sample rate.")

        recognizer = vosk.KaldiRecognizer(model, 16000)
        recognizer.SetSpkModel(speaker_model)

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            recognizer.AcceptWaveform(data)

        result = json.loads(recognizer.FinalResult())
        return result.get("spk", None)

def cosine_dist(vec1, vec2):
    """Compute the cosine distance between two vectors."""
    if vec1 is None or vec2 is None:
        return 1.0  # Maximum distance (not a match)
    return cosine(vec1, vec2)

@app.route('/load-models', methods=['GET'])
def load_models_endpoint():
    """API to manually load models into memory."""
    success, message = load_models()
    status = 200 if success else 500
    return jsonify({"message": message}), status

@app.route('/unload-models', methods=['GET'])
def unload_models_endpoint():
    """API to manually unload models from memory."""
    success, message = unload_models()
    return jsonify({"message": message}), 200

@app.route('/set-speaker-vector', methods=['POST'])
def set_speaker_vector():
    """Extracts the best speaker vector from 3 input audio files and stores it globally."""
    global global_speaker_vector

    if model is None or speaker_model is None:
        return jsonify({"error": "Models are not loaded. Call /load-models first."}), 500

    if 'audio1' not in request.files or 'audio2' not in request.files or 'audio3' not in request.files:
        return jsonify({"error": "Three audio files are required"}), 400

    wav_bytes_list = [request.files[f"audio{i+1}"].read() for i in range(3)]
    speaker_vectors = []

    try:
        for wav_bytes in wav_bytes_list:
            spk_vector = extract_speaker_vector_from_wav_bytes(wav_bytes)
            if spk_vector is not None:
                speaker_vectors.append(spk_vector)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not speaker_vectors:
        return jsonify({"error": "No valid speaker vectors extracted"}), 400

    reference_vector = speaker_vectors[0]
    best_vector = reference_vector
    min_distance = float('inf')

    for vector in speaker_vectors[1:]:
        distance = cosine_dist(reference_vector, vector)
        if distance < min_distance:
            min_distance = distance
            best_vector = vector

    global_speaker_vector = best_vector  # Store the best vector globally

    return jsonify({
        "speaker_vector": best_vector,
        "cosine_distance": min_distance
    })

@app.route('/verify-speaker', methods=['POST'])
def verify_speaker():
    """Verifies if the provided audio matches the globally stored speaker vector."""
    global global_speaker_vector

    if model is None or speaker_model is None:
        return jsonify({"error": "Models are not loaded. Call /load-models first."}), 500

    if 'audio' not in request.files:
        return jsonify({"error": "Audio file is required"}), 400

    if global_speaker_vector is None:
        return jsonify({"error": "No speaker vector has been set. Call /set-speaker-vector first."}), 400

    wav_bytes = request.files['audio'].read()

    try:
        test_vector = extract_speaker_vector_from_wav_bytes(wav_bytes)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if test_vector is None:
        return jsonify({"error": "No valid speaker vector extracted"}), 400

    distance = cosine_dist(global_speaker_vector, test_vector)
    is_verified = distance <= 0.6  # Example threshold
    if(is_verified):
        return jsonify({"verified": "True", "cosine_distance": distance})
    else:
        return jsonify({"verified": "False", "cosine_distance": distance})


def generate_message(priority, location):
    """Generates a message with a Google Maps link if latitude/longitude is provided."""
    if location and isinstance(location, dict) and "latitude" in location and "longitude" in location:
        latitude = location["latitude"]
        longitude = location["longitude"]
        maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
    else:
        maps_link = "Location unavailable"

    if priority == "emergency":
        return (
            f"🚨 EMERGENCY ALERT 🚨\n"
            f"Immediate attention needed! The sender is in **urgent danger** and may require help immediately.\n"
            f"📍 Last known location: {maps_link}\n"
            f"Please check on them and contact emergency services if necessary."
        )
    elif priority == "redFlag":
        return (
            f"⚠️ RED FLAG ALERT ⚠️\n"
            f"The sender feels **uncomfortable or unsafe**, but may not be in immediate danger.\n"
            f"📍 Location: {maps_link}\n"
            f"Check in with them and be available for support if needed."
        )
    else:
        return "Unknown alert type."


def send_sms_via_email(server, recipient_email, message):
    """Sends an SMS using email-to-SMS gateways."""
    try:
        msg = EmailMessage()
        msg.set_content(message)
        msg["Subject"] = "Murmur Alert"
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = recipient_email
        server.send_message(msg)
        print(f"Message sent to {recipient_email}")
        return True

    except Exception as e:
        print(f"Failed to send message to {recipient_email}: {e}")
        return False

@app.route("/text-contacts", methods=["POST"])
def text_contacts():
    try:
        data = request.get_json()
        priority = data.get("priority")
        contacts = data.get("contacts", [])
        location = data.get("location")

        if not priority or not contacts:
            return jsonify({"error": "Missing required fields"}), 400

        message = generate_message(priority, location)
        failed_numbers = []

        # Initialize the SMTP server once
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, APP_PASSWORD)

        for contact in contacts:
            phone_number = contact.get("phoneNumber")
            if not phone_number:
                failed_numbers.append("Missing number")
                continue

            success = False
            for carrier_domain in CARRIER_GATEWAYS:
                sms_email = f"{phone_number}@{carrier_domain}"
                if send_sms_via_email(server, sms_email, message):
                    success = True
                    break  # Stop trying once successful

            if not success:
                failed_numbers.append(phone_number)

        # Close the SMTP server after all messages are sent
        server.quit()

        response = {
            "status": "Messages sent",
            "failed_numbers": failed_numbers if failed_numbers else "All sent successfully"
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    local_ip = os.environ.get('IP_ADDRESS')
    app.run(host=local_ip, port=5000, debug=False)

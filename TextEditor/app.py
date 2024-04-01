import os
import webview
import threading
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

UPLOAD_FOLDER = 'files'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'txt', 'html', 'docx', 'csv', 'md', 'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

def start_server():
    app.run(host='127.0.0.1', port=5000)

@app.route('/save', methods=['POST'])
def save_file():
    data = request.json
    content = data['content']
    filename = data['filename']

    if not filename:
        return jsonify({'message': 'Please provide a filename.'}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    with open(file_path, 'w') as file:
        file.write(content)

    return jsonify({'message': 'File saved successfully.'}), 200

@app.route('/load', methods=['POST'])
def load_file():
    filename = request.json['filename']

    if not filename:
        return jsonify({'message': 'Please provide a filename.'}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(file_path):
        return jsonify({'message': 'File not found.'}), 404

    with open(file_path, 'r') as file:
        content = file.read()

    return jsonify({'content': content}), 200

@app.route('/files')
def get_files():
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    return jsonify({'files': files})

@app.route('/save-as', methods=['POST'])
def save_as_file():
    data = request.json
    content = data['content']
    file_name = data['filename']
    file_format = data['fileFormat']

    if not file_name:
        return jsonify({'message': 'Please provide a filename.'}), 400

    file_path = webview.windows[0].create_file_dialog(webview.SAVE_DIALOG, directory=os.path.expanduser('~'), save_filename=f"{file_name}.{file_format}")

    if file_path:
        with open(file_path, 'w') as file:
            file.write(content)
        return jsonify({'message': 'File saved successfully.'}), 200
    else:
        return jsonify({'message': 'File not saved.'}), 400

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        
    # Start the Flask server in a separate thread
    flask_thread = threading.Thread(target=start_server)
    flask_thread.start()

    # Create and start the PyWebView window
    webview.create_window("The Writer", "http://127.0.0.1:5000", width=1200, height=800)
    webview.start()
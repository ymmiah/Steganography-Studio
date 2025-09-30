# Steganography Studio

A comprehensive, client-side web application for steganography and cryptography. Hide messages in images, or use the super-advanced Universal Decoder with AI-powered forensic analysis to automatically detect and extract hidden data. Also includes hashing tools, a password cracker, and other utilities.

![Steganography Studio UI](https://i.imgur.com/your-screenshot.png) <!-- It's recommended to replace this with an actual screenshot -->

---

## ✨ Features

### 🔬 Universal Decoder (AI-Powered)
- **AI Forensic Analysis**: Leverages the Gemini API to analyze images for steganographic artifacts, providing a confidence score and detailed reasoning.
- **Multi-Method Attack**: Automatically attempts to decode the image using all available steganography methods (LSB, Pattern-based, etc.).
- **Smart Text Analysis**: Decodes text payloads from various formats like Base64, Hex, or raw binary, and attempts AES decryption if a password is provided.

### 🖼️ Steganography Methods
All methods use strong **AES-GCM encryption** to protect the hidden message before encoding.
- **LSB (Least Significant Bit)**: Hides data in the least significant bits of the image's color channels.
- **Pattern LSB**: Hides data in a pseudo-random pixel pattern determined by a secret "Stego Key". More resilient to basic analysis than standard LSB.
- **MD5 Pattern LSB**: Uses the MD5 hash of a "Stego Key" to seed the pseudo-random pixel pattern for enhanced complexity.
- **RD (Random Dot) Pattern**: Encodes the message into a new black and white random-dot image.
- **Morse Pattern**: Encodes the message into a new image representing the data in visual Morse code.

### 🔐 Cryptographic Tools
- **Multi-Hash Generator**: Instantly generate hashes from text using MD2, MD4, MD5, SHA-1, SHA-224, SHA-256, SHA-384, and SHA-512.
- **MD5 Hash Cracker**: An educational tool to demonstrate hash cracking techniques.
    - **Dictionary Attack**: Uses a provided wordlist.
    - **Brute-force Attack**: Tries all combinations for a given character set and length.
    - **AI Attack**: Uses the Gemini API to generate a contextually aware list of likely passwords to test.
- **Utilities**:
    - **Base64 Encoder/Decoder**: Quickly convert text to and from Base64.
    - **Password Strength Meter**: Analyzes password strength and provides actionable feedback.

---

## 🚀 How to Use

1.  **Select a Tool**: Use the sidebar on the left to choose a tool. For beginners, the **Universal Decoder** is a great starting point.
2.  **Choose an Action**: For steganography modes, select whether you want to "Encrypt & Hide" or "Extract & Decrypt".
3.  **Provide Inputs**:
    -   Upload an image file.
    -   Type your secret message.
    -   Enter a strong password for encryption/decryption.
    -   Provide a "Stego Key" if using a pattern-based method.
4.  **Process**: Click the main action button to start the process.
5.  **View Results**: The output (encoded image, decrypted text, analysis report) will appear on the right.

---

## 🛠️ Technical Stack

- **Frontend**: React & TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: Google Gemini API
- **Modules**: Loaded via ES Modules from `esm.sh`.

### 🛡️ Security First: Client-Side Operations

All cryptographic functions, hashing, and steganographic processing are performed **entirely in your browser**. Your files, messages, and passwords are never uploaded to any server, ensuring complete privacy and security.

The only exceptions are the AI-powered features, which send only the necessary data (the image for forensic analysis or the target hash for the AI cracker) to the Google Gemini API for processing.

---

## 📄 License

This project is licensed under the MIT License with an added restriction. You are free to use, modify, and distribute this software for personal and educational purposes.

**Commercial use is prohibited without explicit written permission.**

For full license details, please see the [LICENSE.md](LICENSE.md) file.

---

## ⚖️ Disclaimer

This application is intended for educational purposes only. The goal is to demonstrate the principles of steganography and cryptography. The developers are not responsible for any misuse of this tool. Always ensure you have the right to modify and use any images you process.
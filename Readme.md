# Steganography Studio 🛡️

**A powerful, browser-based toolkit for digital steganography and cryptography. Hide secrets in plain sight, uncover hidden data with AI-powered analysis, and explore a suite of advanced crypto tools.**

![Steganography Studio UI](https://i.imgur.com/rS2aH0g.png)

---

## ✨ Core Features

This application is divided into three main sections: **Analysis**, **Steganography**, and **Crypto Tools**, all running securely in your browser.

### 🔬 Universal Decoder (AI-Powered Analysis)

The star of the studio. This tool is designed to be your first stop for analyzing any potentially suspicious image.

-   **AI Forensic Analysis**: Leverages the **Google Gemini API** to perform a deep forensic analysis of images. It looks for subtle artifacts, unnatural noise, and statistical anomalies that could indicate hidden data, providing a confidence score and detailed reasoning.
-   **Multi-Method Attack**: After the AI analysis, it systematically attempts to decode the image using **every available steganography method** (LSB, Pattern LSB, etc.) with the credentials you provide.
-   **Smart Text Analysis**: Can also analyze raw text payloads. It automatically detects formats like Base64, Hex, or binary, and attempts AES decryption if a password is provided.

---

### 🖼️ Steganography Methods

Embed your secret messages within images using a variety of techniques. All methods protect your message with strong **AES-GCM encryption** before the hiding process begins.

-   **LSB (Least Significant Bit)**: The classic method. Hides data by altering the least significant bit of each color channel in an image's pixels. Simple and effective for high-capacity storage.
-   **Pattern LSB**: An evolution of LSB. It hides data in a pseudo-random pixel pattern determined by a secret "Stego Key," making it more resilient to basic forensic analysis.
-   **MD5 Pattern LSB**: Enhances the Pattern LSB method by using the MD5 hash of your "Stego Key" to seed the pseudo-random pixel pattern, adding another layer of complexity.
-   **RD (Random Dot) Pattern**: Encodes your encrypted message into a brand new black-and-white image composed of random-looking dots.
-   **Morse Pattern**: Generates a new image that visually represents your encrypted message as a sequence of Morse code signals.

---

### 🔐 Cryptographic Toolkit

A suite of powerful tools for various cryptographic tasks.

-   **Multi-Hash Generator**: Instantly generate cryptographic hashes from any text input. Supports a wide range of algorithms:
    -   `MD2`, `MD4`, `MD5`
    -   `SHA-1`, `SHA-224`, `SHA-256`, `SHA-384`, `SHA-512`
-   **MD5 Cracker (Educational Tool)**: A powerful simulator to demonstrate how password hashes are cracked.
    -   **Dictionary Attack**: Attempts to find a match using a wordlist file you provide.
    -   **Brute-force Attack**: Systematically tries every possible combination of characters up to a specified length.
    -   **AI Attack**: Uses the Gemini API to generate a highly targeted list of likely password candidates based on common patterns, then tests them against the hash.
-   **Utilities**:
    -   **Base64 Encoder/Decoder**: Quickly convert text to and from the Base64 format.
    -   **Password Strength Meter**: Analyzes any password in real-time to assess its strength and provides actionable feedback for improvement.

---

## 🚀 How to Use

1.  **Select a Tool**: Use the sidebar to choose from the available tools. For first-time analysis, the **Universal Decoder** is highly recommended.
2.  **Choose an Action**: For steganography modes, select whether you want to "Encrypt & Hide" or "Extract & Decrypt".
3.  **Provide Inputs**: Fill in the required fields, which may include uploading an image, typing a message, and setting a password or Stego Key.
4.  **Run Process**: Click the main action button to start the encoding, decoding, or analysis.
5.  **View Results**: The output—whether it's a new image, a decrypted message, or a detailed report—will appear on the right side of the screen.

---

## 🛡️ Security & Privacy First: Client-Side by Design

Your privacy is paramount. All core cryptographic functions, hashing, and steganographic processing are performed **entirely in your browser**.

-   **Your Data Stays With You**: Your files, messages, and passwords are **never** uploaded to any server. They are processed locally on your machine.
-   **API Usage Transparency**: The only exceptions are the AI-powered features, which send only the minimum necessary data to the Google Gemini API for processing (the image for forensic analysis or the target hash for the AI cracker).

---

## 🛠️ Technical Stack

-   **Framework**: React & TypeScript
-   **Styling**: Tailwind CSS
-   **AI/ML**: Google Gemini API
-   **Cryptography**: Native Web Crypto API for robust, standardized encryption.
-   **Deployment**: Runs as a static client-side application.

---

## 📄 License

This project is licensed under the MIT License with an important restriction. You are free to use, modify, and distribute this software for personal and educational purposes.

**Commercial use is strictly prohibited without explicit written permission from the copyright holder.**

Please see the [LICENSE.md](LICENSE.md) file for full details.

---

## ⚖️ Disclaimer

This application is intended for **educational purposes only** to demonstrate the principles of steganography and cryptography. The developers assume no liability and are not responsible for any misuse of this tool. Always ensure you have the legal right to use and modify any images you process.
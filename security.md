
# Security Policy

This document outlines the security model and responsible disclosure policy for the Steganography Studio application.

## 🛡️ Security Model & Guarantees

The security and privacy of our users are a top priority. The application is designed with the following principles:

### 1. Client-Side Operations

**All core cryptographic and steganographic operations are performed entirely within the user's browser.**

-   **No Data Uploads**: Your images, secret messages, passwords, and keys are **never** sent to or stored on a server. They are processed locally on your machine.
-   **Privacy**: Because your sensitive data never leaves your computer, you maintain full control and privacy over it.

### 2. Google Gemini API Usage

Certain advanced features require interaction with the Google Gemini API. This is the only time data is sent externally.

-   **Universal Decoder (AI Forensic Analysis)**: When this feature is used, the selected **image file is sent** to the Gemini API for analysis. The prompt asks the model to look for steganographic artifacts. No other data (like passwords or keys) is sent.
-   **MD5 Cracker (AI Attack)**: When this attack mode is used, only the **target MD5 hash is sent** to the Gemini API. The prompt asks the model to generate a list of likely password candidates for that hash.

The API key used for these features is managed by the execution environment and is not exposed to the client.

### 3. No Data Storage

The application is stateless. It does not use cookies, local storage, or any other method to persist user data between sessions. Once you close the browser tab, all information is gone.

### 4. Third-Party Dependencies

The application loads its dependencies (like React) from `esm.sh`. While this is a reputable provider, it represents a trust dependency on a third party to serve secure and unmodified code.

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us responsibly.

**How to Report:**

1.  Please open a new **Issue** in the project's GitHub repository.
2.  Title the issue clearly, for example: `[Security] Potential XSS in Text Output`.
3.  In the body of the issue, please provide:
    -   A detailed description of the vulnerability.
    -   Step-by-step instructions on how to reproduce it.
    -   The potential impact of the vulnerability.
    -   Any suggested mitigation, if you have one.

Please **do not** publicly disclose the vulnerability until we have had a chance to review it and release a patch. We will do our best to respond to your report promptly.

## Limitations & Disclaimer

-   The security of the data hidden using the steganography tools is heavily dependent on the **strength of the password** you choose. A weak password can be easily broken, compromising your hidden message.
-   This tool is for **educational purposes** and is not guaranteed to be secure against determined, professional forensic analysis. Advanced steganography detection techniques may be able to identify the presence of hidden data.

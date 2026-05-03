# SOS Dock: Emergency Response System

The **SOS Dock** is an integrated IoT safety ecosystem designed for high-precision emergency monitoring and rapid dispatch coordination. The platform bridges portable SOS hardware with field responders through a synchronized Desktop and Mobile environment.

---

## 1. Central Command Desktop Application
The Desktop Application serves as the **Operational Mission Control**. It is designed for administrators and dispatch controllers to manage large-scale emergency operations from a single interface.

### Key Capabilities
*   **Hardware Telemetry Bridge:** Real-time acquisition of emergency data from portable SOS devices via Serial communication (Arduino/NRF modules).
*   **Live Geospatial Command Center:** An interactive map visualization that tracks the real-time position of all active alerts and available dispatch teams within regional boundaries.
*   **Intelligent Severity Filtering:** Automatically classifies alerts into **Minor**, **Moderate**, or **Emergency** categories based on hardware trigger patterns (click counts).
*   **Automated Resource Dispatch:** Features an "Auto-Assignment" engine that identifies the nearest available team to an incident and pushes the dispatch order instantly.
*   **Device & Team Fleet Management:** Full administrative control over the database of registered SOS devices, user emergency contacts, and the dispatch personnel roster.
*   **Unified Synchronization Hub:** Orchestrates the central WebSocket server, ensuring that every status update is mirrored across the entire network in milliseconds.

---

## 2. Responder Mobile Application
The Mobile Application is a **Mission-Critical Field Tool** built for dispatch teams. It transforms a standard smartphone into a professional-grade tracking and response terminal.

### Key Capabilities
*   **Instant Dispatch Notifications:** Responders receive high-priority push notifications with audible alerts for new emergencies, providing the victim's name, severity, and precise GPS location.
*   **Active GPS Telemetry:** While on duty, the app transmits high-frequency location updates (every 3 seconds) back to the Command Center to ensure responder safety and logistical accuracy.
*   **Incident Lifecycle Management:**
    *   **Rapid Acknowledgment:** One-tap interface to "Accept" a dispatch, instantly notifying the Desktop operator.
    *   **Resolution Tracking:** Ability to mark incidents as "Completed" directly from the field to clear the dashboard for new tasks.
*   **Availability Orchestration:** Responders can toggle their status between **Available** and **Busy**, which directly informs the Desktop app's automated assignment logic.
*   **Secure Authentication:** Integrated login system linked to the central Supabase backend to ensure that sensitive emergency data is only accessible to verified personnel.

---

## System Integration Summary

| Feature | Desktop App (Command) | Mobile App (Field) |
| :--- | :--- | :--- |
| **Primary Role** | Monitor, Manage & Dispatch | Receive, Navigate & Respond |
| **Connectivity** | Serial Port + WebSockets | WebSockets + REST API |
| **Mapping** | Full Operational/Regional Overview | Local Navigation to Incident |
| **Tracking** | Monitors All Field Entities | Transmits Active GPS Location |
| **Core Logic** | Automated Proximity Assignment | Task Resolution & Status Updates |
| **User Base** | Dispatchers / Admin | Emergency Responders / Field Teams |

---

## Operational Workflow
1.  **Trigger:** A portable SOS device sends data (GPS + Severity) to the **Desktop App** via Serial.
2.  **Analysis:** The **Desktop App** registers the alert and identifies the nearest available responder.
3.  **Dispatch:** The **Mobile App** receives an immediate push alert with incident details.
4.  **Response:** The responder navigates to the scene, with their live progress tracked by the **Desktop App**.
5.  **Resolution:** Once the situation is handled, the responder marks it "Complete" via the **Mobile App**, clearing the task globally.

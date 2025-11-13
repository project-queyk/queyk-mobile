# Queyk Mobile

An earthquake monitoring and emergency response system designed for educational institutions. Queyk provides seismic activity monitoring, safety protocols, and evacuation planning to help schools prepare for and respond to earthquakes.

<div style="display: flex; gap: 10px;">
    <img src="https://queyk.vercel.app/mobile-1.jpg" alt="queyk mobile 1" style="width: 33%; height: auto;">
    <img src="https://queyk.vercel.app/mobile-2.jpg" alt="queyk mobile 2" style="width: 33%; height: auto;">
    <img src="https://queyk.vercel.app/mobile-3.jpg" alt="queyk mobile 3" style="width: 33%; height: auto;">
</div>

## Features

- 📊 **Earthquake Monitoring Dashboard** - Dashboard showing seismic activity data with hourly magnitude and frequency readings
- 🚨 **Emergency Response Protocols** - Comprehensive safety guidelines based on NDRRMC and PHIVOLCS standards
- 🗺️ **Evacuation Planning** - Interactive floor plans with marked emergency exits and assembly points
- 🔐 **Secure Authentication** - School email-based login system
- 📋 **User Manual** - Complete guide for system navigation and usage
- ⚡ **Offline Capabilities** - Downloadable evacuation plans for use during emergencies

## Tech Stack

- **Framework:** [Expo](https://expo.dev) (React Native)
- **Language:** TypeScript
- **UI Components:** Custom and Expo components
- **Authentication:** Google OAuth (school email)
- **Database:** Supabase
- **Data Standards:** NDRRMC, PHIVOLCS, RA 10121 compliance

## Dashboard Features

### Seismic Activity Monitoring

- **Activity Chart:** Hourly magnitude and frequency readings
- **Peak Magnitude:** Highest seismic reading of the day
- **Average Magnitude:** Daily average seismic activity level
- **Significant Hours:** Hours with notable activity (>1.0 magnitude)
- **Peak Activity:** Hour with most frequent seismic events

### Safety Information

- **Emergency Protocols:** Before, during, and after earthquake procedures
- **Evacuation Sites:** Nearest evacuation location finder
- **Safety Alerts:** Alerts for significant seismic activity

## Project Structure

```
├── app/
│   ├── (tabs)/
│   │   ├── dashboard.tsx         # Seismic activity dashboard
│   │   ├── protocols.tsx         # Emergency response protocols
│   │   ├── evacuation-plan.tsx   # Building floor plans & exits
│   │   ├── user-management.tsx   # User management
│   │   └── profile.tsx           # User profile
│   ├── sign-in.tsx               # Authentication screen
│   └── _layout.tsx               # Root layout
├── components/
│   ├── ui/                       # UI components
│   ├── Card.tsx                  # Card component
│   └── haptic-tab.tsx            # Haptic tab navigation
├── contexts/
│   └── AuthContext.tsx           # Authentication context
├── hooks/
│   └── use-network-status.ts     # Network status hook
├── utils/
│   ├── auth.ts                   # Auth helpers
│   ├── floors.ts                 # Floor plan helpers
│   └── protocols.ts              # Emergency protocol data
├── assets/
│   └── images/                   # Floor plans, icons
├── config/
│   └── auth.config.ts            # Auth configuration
└── constants/
    └── theme.ts                  # Theme constants
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio or Xcode (for emulators/simulators)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd queyk-mobile
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables (if needed):

```bash
cp .env.example .env
```

4. Configure authentication and API keys in `.env`

### Development

Run the Expo development server:

```bash
npx expo start
```

Open the app in:

- [Expo Go](https://expo.dev/go) on your mobile device
- Android emulator
- iOS simulator
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)

## Usage Guide

### Authentication

- Access the system using your school email credentials
- Login through Google OAuth on the sign-in screen
- Protected routes ensure secure access to monitoring data

### Dashboard Navigation

- **Dashboard:** View seismic activity data and key metrics
- **Protocols:** Access emergency response procedures
- **Evacuation Plan:** View building floor plans and emergency exits
- **User Management:** Manage users and permissions
- **Profile:** View and edit user profile

### Emergency Features

- **Activity Monitoring:** Track seismic events and patterns
- **Offline Access:** Download evacuation plans for emergency use
- **Mobile Support:** Full functionality on mobile devices during emergencies

## Safety Standards Compliance

This system follows guidelines from:

- **NDRRMC** (National Disaster Risk Reduction and Management Council)
- **PHIVOLCS** (Philippine Institute of Volcanology and Seismology)
- **RA 10121** (Philippine Disaster Risk Reduction and Management Act)

## Deployment

### Build for Production

```bash
npx expo run:android   # Build and run on Android
npx expo run:ios       # Build and run on iOS
```

See [Expo documentation](https://docs.expo.dev/) for more deployment options.

## Contributing

We welcome contributions to improve earthquake monitoring and safety features:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/safety-improvement`)
3. Commit your changes (`git commit -m 'Add enhanced alert system'`)
4. Push to the branch (`git push origin feature/safety-improvement`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Emergency Contact

For system support or emergency procedures:

- Open an issue on GitHub for technical problems
- Contact your school's emergency coordinator for safety protocols
- Follow official NDRRMC guidelines during actual emergencies

---

**⚠️ Important:** This system is designed to supplement, not replace, official emergency protocols. Always follow your institution's established emergency procedures during actual seismic events.

© 2025 Queyk Project - All Rights Reserved

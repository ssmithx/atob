#A to ₿ - Decentralized Package Delivery

A to ₿ is a decentralized package delivery application built on Nostr, allowing users to post packages, view available packages on a map, pick up packages for delivery, and confirm deliveries - all without relying on centralized servers.

This project was developed in response to the [ A to ₿ Dev Bounty](https://github.com/ssmithx/atob/blob/main/bounty.txt).

##A to ₿ Logo
###Features

- **Decentralized Communication**: Uses Nostr protocol for peer-to-peer communication
- **Package Management**: Post, view, pick up, and deliver packages
- **Interactive Map**: View available packages on an interactive map
- **Status Tracking**: Track packages through their entire lifecycle
- **Offline Support**: Local storage fallback when Nostr is unavailable
- **Relay Management**: Configure and test Nostr relays
- **QR Code Delivery Confirmation**: Generate QR codes for delivery confirmation

## Technologies Used

- Next.js: React framework for the frontend
- Nostr Protocol: Decentralized social networking protocol
- Tailwind CSS: Utility-first CSS framework
- shadcn/ui: High-quality UI components
- Local Storage: For offline data persistence
- Leaflet: For interactive maps
- Vibe Coded with AI

## Getting Started

### Prerequisites

    Node.js 16+ and npm/yarn
    A Nostr browser extension (Alby or nos2x recommended)

Installation

1.  Clone the repository:

         git clone https://github.com/yourusername/a-to-b.git

    cd a-to-b

2.  Install dependencies:
    npm install

# or

yarn install

3. Start the development server:
   npm run dev

# or

yarn dev 4. Open http://localhost:3000

    in your browser

## Usage

### Login

    Install a Nostr browser extension (Alby)
    Connect with your Nostr key on the login page

### Posting a Package

1.  Navigate to "Post Package" from the home screen
2.  Fill in package details (title, pickup location, destination, cost)
3.  Submit the form to create a new package

### Viewing Packages

1.  Navigate to "View Packages" from the home screen
2.  Toggle between "Available Packages" and "My Packages" views
3.  See packages on the map or in the list view
4.  Click on a package to view details

### Picking Up a Package

1.  Find an available package in the "View Packages" screen
2.  Click the "Pick Up" button to accept the delivery job
3.  The package will now appear in your "My Deliveries" list

### Completing a Delivery

1.  Navigate to "My Deliveries" from the home screen
2.  Select the package you're delivering
3.  Click "Show QR Code" to generate a confirmation code for the recipient, mark delivered there or
4.  Click "Complete" when the delivery is finished

### Managing Relays

1. Navigate to "Settings" from the "View Packages" screen
2. Add, remove, or check the status of Nostr relays
3. Add suggested relays with a single click

#Project Structure
a-to-b/
├── app/ # Next.js app router pages
│ ├── login/ # Login page
│ ├── post-package/ # Package creation page
│ ├── view-packages/ # Package listing and map view
│ ├── my-deliveries/ # Active deliveries management
│ └── settings/ # Relay configuration
├── components/ # React components
│ ├── ui/ # UI components (shadcn)
│ ├── nostr-login.tsx # Nostr authentication
│ ├── package-map.tsx # Map visualization
│ └── ...
├── lib/ # Utility functions and services
│ ├── nostr.ts # Nostr integration
│ ├── nostr-service.ts # Nostr relay management
│ ├── nostr-keys.ts # Key management
│ └── local-package-service.ts # Local storage management
└── public/ # Static assets

## Nostr Integration

A to ₿ uses custom Nostr event kinds:

    30001: Package events
    30002: Delivery events

The application connects to multiple Nostr relays for redundancy and uses local storage as a fallback when Nostr is unavailable.

## Debugging

The application includes a debug panel accessible from the "View Packages" screen that allows you to:

1.  Check relay connectivity
2.  View local storage data
3.  Troubleshoot Nostr issues

## Contributing

1.  Fork the repository
2.  Create your feature branch (git checkout -b feature/amazing-feature)
3.  Commit your changes (git commit -m 'Add some amazing feature')
4.  Push to the branch (git push origin feature/amazing-feature)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)

- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

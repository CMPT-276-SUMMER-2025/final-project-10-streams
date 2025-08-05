# Project Structure

## 📁 Organized Repository Structure

```
final-project-10-streams/
├── 📄 README.md                     # Main project documentation
├── 📄 package.json                  # Root dependencies and scripts
├── 📄 jest.config.js                # Testing configuration
├── 📄 run-tests.js                  # Test automation script
├── 📄 ci-cd.yml                     # GitHub Actions CI/CD pipeline
├── 📄 .babelrc                      # Babel transpilation config
├── 📄 .gitignore                    # Git ignore rules
│
├── 🗂️ backend/                       # Express.js backend server
│   ├── 📄 index.js                  # Main server file with API routes
│   ├── 📄 package.json              # Backend dependencies
│   └── 📄 README.md                 # Backend documentation
│
├── 🗂️ public/                        # Frontend static files
│   ├── 📄 index.html                # Homepage
│   ├── 📄 about.html                # About page
│   ├── 📄 search.html               # Anime search functionality
│   ├── 📄 recommendations.html      # Recommendations page
│   ├── 📄 tracemoe.html             # Reverse image search
│   ├── 📄 chatbot.html              # AI chatbot interface
│   │
│   ├── 📄 main.js                   # Main JavaScript functionality
│   ├── 📄 search.js                 # Search page logic
│   ├── 📄 gemini.js                 # Secure chatbot integration
│   ├── 📄 Script.js                 # Additional utilities
│   │
│   ├── 🗂️ css/                       # Organized stylesheets
│   │   ├── 📄 main.css              # Global styles
│   │   ├── 📄 about.css             # About page + Ghibli styles
│   │   ├── 📄 search.css            # Search functionality styles
│   │   ├── 📄 recommendations.css   # Recommendations page styles
│   │   ├── 📄 trace.css             # TraceMoe page styles
│   │   ├── 📄 gemini.css            # Chatbot styles
│   │   ├── 📄 new.css               # Additional modern styles
│   │   └── 🗂️ images/               # CSS-related images
│   │
│   └── 🗂️ images/                    # Project images and assets
│       ├── 📄 logo.png              # Project logo
│       ├── 📄 Website_logo_new.png  # Updated website logo
│       └── [other image assets]     # Team photos, anime images, etc.
│
├── 🗂️ tests/                         # Comprehensive test suite
│   ├── 📄 setup.js                  # Jest test setup
│   ├── 📄 gemini.test.js            # Chatbot functionality tests
│   ├── 📄 gemini-security.test.js   # Security implementation tests
│   ├── 📄 mal_unit_jesttests.js     # MyAnimeList API tests
│   ├── 📄 tracemoe-test.js          # TraceMoe API tests
│   ├── 📄 jest_intergration API tests.js  # Integration tests
│   └── 📄 general animation tests.js # Animation feature tests
│
├── 🗂️ netlify/functions/             # Serverless functions
│   ├── 📄 malsearch.js              # MyAnimeList search proxy
│   └── 📄 tracemoe-proxy.js         # TraceMoe API proxy
│
├── 🗂️ .github/workflows/            # CI/CD automation
├── 🗂️ coverage/                     # Test coverage reports (generated)
└── 🗂️ node_modules/                 # Dependencies (gitignored)
```

import { Company, UserExplorationState } from '../types';

// Base company dataset - original data without user modifications
const baseCompanies: Company[] = [
  {
    "id": 1,
    "name": "Airbnb",
    "logo": "https://logo.clearbit.com/airbnb.com",
    "careerUrl": "https://careers.airbnb.com/",
    "matchScore": 96,
    "industry": "Travel/Marketplace",
    "stage": "Public",
    "location": "San Francisco, CA",
    "employees": "~6800",
    "remote": "Live and Work Anywhere - fully remote",
    "openRoles": 3,
    "connections": [
      5,
      11,
      2
    ],
    "connectionTypes": {
      "2": "People-First Culture",
      "5": "Marketplace Model",
      "11": "Platform Strategy"
    },
    "matchReasons": [
      "Staff Experience Researcher and Lead Experience Researcher roles actively posted",
      "Industry-leading 'Live and Work Anywhere' remote policy",
      "Marketplace platform experience matches ZipRecruiter background",
      "Transparent leadership culture with executive meeting notes shared company-wide"
    ],
    "color": "#10B981",
    "angle": 0,
    "distance": 75
  },
  {
    "id": 2,
    "name": "HubSpot",
    "logo": "https://logo.clearbit.com/hubspot.com",
    "careerUrl": "https://www.hubspot.com/careers",
    "matchScore": 94,
    "industry": "Marketing Technology/SaaS",
    "stage": "Public",
    "location": "Cambridge, MA",
    "employees": "~8000",
    "remote": "Hybrid-friendly with flexible remote",
    "openRoles": 1,
    "connections": [
      1,
      13,
      4
    ],
    "connectionTypes": {
      "1": "Growth Culture",
      "4": "Research Maturity",
      "13": "B2B Platform"
    },
    "matchReasons": [
      "Principal UX Researcher role at $197K-$257K with 40+ person research team",
      "Head of Research and Directors leading mature research organization",
      "B2B SaaS platform serving 238K+ customers",
      "#5 Best Leadership Team by Comparably recognition"
    ],
    "color": "#10B981",
    "angle": 30,
    "distance": 80
  },
  {
    "id": 3,
    "name": "The Trade Desk",
    "logo": "https://logo.clearbit.com/thetradedesk.com",
    "careerUrl": "https://careers.thetradedesk.com/",
    "matchScore": 93,
    "industry": "AdTech",
    "stage": "Public",
    "location": "Irvine, CA",
    "employees": "~5000",
    "remote": "Hybrid with flexible remote",
    "openRoles": 2,
    "connections": [
      9,
      4,
      2
    ],
    "connectionTypes": {
      "2": "High Growth",
      "4": "Research Excellence",
      "9": "AdTech Experience"
    },
    "matchReasons": [
      "Staff User Researcher and UX Researcher II roles posted",
      "Direct alignment with Google adtech experience",
      "Located in Orange County - ideal for LA/SD area preference",
      "Q3 2024 revenue $628M with 27% YoY growth"
    ],
    "color": "#10B981",
    "angle": 60,
    "distance": 85
  },
  {
    "id": 4,
    "name": "Figma",
    "logo": "https://logo.clearbit.com/figma.com",
    "careerUrl": "https://www.figma.com/careers/",
    "matchScore": 91,
    "industry": "Design Tools/SaaS",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~1200",
    "remote": "Hybrid model with SF office access",
    "openRoles": 1,
    "connections": [
      2,
      5,
      12
    ],
    "connectionTypes": {
      "2": "Design Platform",
      "5": "Collaboration Tools",
      "12": "Research Culture"
    },
    "matchReasons": [
      "Focus on Rapid Research methodology aligns with high-velocity execution",
      "Mission to 'make design accessible to all' - democratic research approach",
      "73% employee recommendation rate on Glassdoor",
      "Platform product with collaborative focus matches marketplace experience"
    ],
    "color": "#10B981",
    "angle": 90,
    "distance": 90
  },
  {
    "id": 5,
    "name": "Retool",
    "logo": "https://logo.clearbit.com/retool.com",
    "careerUrl": "https://retool.com/careers",
    "matchScore": 89,
    "industry": "Developer Tools/Low-Code",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~800",
    "remote": "Hybrid with quarterly gatherings",
    "openRoles": 1,
    "connections": [
      1,
      4,
      6
    ],
    "connectionTypes": {
      "1": "Platform Strategy",
      "4": "B2B Focus",
      "6": "Founding Opportunity"
    },
    "matchReasons": [
      "UX Researcher role - opportunity to be founding researcher",
      "Sequoia and GV backing with Fortune 500 customers",
      "Low-code platform creating complex B2B research challenges",
      "Hybrid SF model supports LA-area travel"
    ],
    "color": "#F59E0B",
    "angle": 120,
    "distance": 95
  },
  {
    "id": 6,
    "name": "Clay",
    "logo": "https://logo.clearbit.com/clay.com",
    "careerUrl": "https://clay.com/careers",
    "matchScore": 87,
    "industry": "Data/Sales Tech",
    "stage": "Series B",
    "location": "New York, NY",
    "employees": "~150",
    "remote": "Remote-friendly with NYC hub",
    "openRoles": 1,
    "connections": [
      5,
      8,
      14
    ],
    "connectionTypes": {
      "5": "B2B Platform",
      "8": "Data Research",
      "14": "High Growth"
    },
    "matchReasons": [
      "UX Research Lead role - $40M Series B funding, $1.3B valuation",
      "Sequoia-backed with enterprise customers like Anthropic and Notion",
      "Kind, creative, close-knit team culture",
      "Data workflow platform serving 100K+ users"
    ],
    "color": "#F59E0B",
    "angle": 150,
    "distance": 100
  },
  {
    "id": 7,
    "name": "Hinge Health",
    "logo": "https://logo.clearbit.com/hingehealth.com",
    "careerUrl": "https://www.hingehealth.com/careers",
    "matchScore": 90,
    "industry": "HealthTech",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~2000",
    "remote": "Remote-first with optional office",
    "openRoles": 1,
    "connections": [
      10,
      16,
      3
    ],
    "connectionTypes": {
      "3": "Growth Stage",
      "10": "HealthTech",
      "16": "B2B/B2C Mix"
    },
    "matchReasons": [
      "Sr. UX Researcher role actively posted, IPO-bound with $6.2B valuation",
      "LinkedIn 'Top 50 Startups' culture recognition",
      "Serving 23 million people with proven clinical outcomes",
      "Direct healthcare experience alignment with Kaiser Permanente background"
    ],
    "color": "#10B981",
    "angle": 180,
    "distance": 92
  },
  {
    "id": 8,
    "name": "Linear",
    "logo": "https://logo.clearbit.com/linear.app",
    "careerUrl": "https://linear.app/careers",
    "matchScore": 85,
    "industry": "Productivity/Project Management",
    "stage": "Series B",
    "location": "San Francisco, CA",
    "employees": "~80",
    "remote": "Fully remote",
    "openRoles": 0,
    "connections": [
      6,
      5,
      4
    ],
    "connectionTypes": {
      "4": "Quality Culture",
      "5": "Developer Focus",
      "6": "B2B Tools"
    },
    "matchReasons": [
      "Quality craftsmanship culture and 'Build with users' principle",
      "$35M Series B led by Accel with exceptional culture",
      "Used by Cash App, Supercell, and Vercel",
      "Fully remote with principle-driven development approach"
    ],
    "color": "#F59E0B",
    "angle": 210,
    "distance": 105
  },
  {
    "id": 9,
    "name": "Oura Health",
    "logo": "https://logo.clearbit.com/ouraring.com",
    "careerUrl": "https://ouraring.com/careers",
    "matchScore": 84,
    "industry": "HealthTech/Wearables",
    "stage": "Series C",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-friendly with SF office",
    "openRoles": 1,
    "connections": [
      7,
      10,
      1
    ],
    "connectionTypes": {
      "1": "People-First",
      "7": "HealthTech",
      "10": "Consumer Product"
    },
    "matchReasons": [
      "Senior UX Researcher role for consumer health technology with 2.5M+ users",
      "Every employee receives an Oura Ring - people-first benefits",
      "Consumer health B2C platform experience",
      "Mission-driven culture focused on inner potential"
    ],
    "color": "#F59E0B",
    "angle": 240,
    "distance": 110
  },
  {
    "id": 10,
    "name": "Dexcom",
    "logo": "https://logo.clearbit.com/dexcom.com",
    "careerUrl": "https://www.dexcom.com/careers",
    "matchScore": 88,
    "industry": "MedTech/Diabetes Care",
    "stage": "Public",
    "location": "San Diego, CA",
    "employees": "~11000",
    "remote": "Hybrid with San Diego headquarters",
    "openRoles": 1,
    "connections": [
      7,
      9,
      3
    ],
    "connectionTypes": {
      "3": "Platform Integration",
      "7": "HealthTech",
      "9": "Medical Device"
    },
    "matchReasons": [
      "User Research Lead roles in San Diego - perfect location match",
      "25-year diabetes innovation leader serving millions",
      "Partnerships with Apple creating platform complexity",
      "Strong mission-driven culture focused on changing lives"
    ],
    "color": "#F59E0B",
    "angle": 270,
    "distance": 118
  },
  {
    "id": 11,
    "name": "Udemy",
    "logo": "https://logo.clearbit.com/udemy.com",
    "careerUrl": "https://about.udemy.com/careers/",
    "matchScore": 86,
    "industry": "EdTech",
    "stage": "Public",
    "location": "San Francisco, CA",
    "employees": "~2500",
    "remote": "Global remote-friendly",
    "openRoles": 1,
    "connections": [
      1,
      18,
      2
    ],
    "connectionTypes": {
      "1": "Marketplace Model",
      "2": "B2B/B2C Platform",
      "18": "EdTech"
    },
    "matchReasons": [
      "Senior Director UX Research role - marketplace model alignment",
      "EdTech experience matches Age of Learning background",
      "Mission of improving lives through learning",
      "Global remote-friendly supports CA location preferences"
    ],
    "color": "#F59E0B",
    "angle": 300,
    "distance": 112
  },
  {
    "id": 12,
    "name": "Maze",
    "logo": "https://logo.clearbit.com/maze.co",
    "careerUrl": "https://maze.co/careers/",
    "matchScore": 92,
    "industry": "UX Research Tools",
    "stage": "Series B",
    "location": "Amsterdam, Netherlands",
    "employees": "~200",
    "remote": "Fully remote with global coverage",
    "openRoles": 1,
    "connections": [
      4,
      13,
      2
    ],
    "connectionTypes": {
      "2": "Remote Culture",
      "4": "Research Platform",
      "13": "Research Excellence"
    },
    "matchReasons": [
      "Senior Research Partner role - research platform company with ultimate culture fit",
      "Research expertise drives everything - meta-research opportunities",
      "$1,500 setup funds and global health coverage",
      "Serving 60K+ brands including Samsung"
    ],
    "color": "#10B981",
    "angle": 330,
    "distance": 88
  },
  {
    "id": 13,
    "name": "Gusto",
    "logo": "https://logo.clearbit.com/gusto.com",
    "careerUrl": "https://gusto.com/careers",
    "matchScore": 89,
    "industry": "HR/Payroll SaaS",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~5000",
    "remote": "Flexible remote across US",
    "openRoles": 1,
    "connections": [
      2,
      12,
      5
    ],
    "connectionTypes": {
      "2": "B2B Platform",
      "5": "Customer Focus",
      "12": "Research Culture"
    },
    "matchReasons": [
      "Staff UX Researcher role with 'everyone speaks to customers' philosophy",
      "$10B+ valuation serving 300,000+ businesses",
      "Featured in Designer Fund for exceptional collaborative culture",
      "Head of UX Research leading democratized research practices"
    ],
    "color": "#F59E0B",
    "angle": 45,
    "distance": 120
  },
  {
    "id": 14,
    "name": "Oscar Health",
    "logo": "https://logo.clearbit.com/hioscar.com",
    "careerUrl": "https://www.hioscar.com/careers",
    "matchScore": 81,
    "industry": "HealthTech/Insurance",
    "stage": "Public",
    "location": "New York, NY",
    "employees": "~3500",
    "remote": "Hybrid with remote capabilities",
    "openRoles": 1,
    "connections": [
      7,
      10,
      6
    ],
    "connectionTypes": {
      "6": "Research Innovation",
      "7": "HealthTech",
      "10": "Healthcare Platform"
    },
    "matchReasons": [
      "UX Research Methods innovation leader with acclaimed methodology contributions",
      "Industry methodology recognition through 'UX Research Methods Map'",
      "Public company stability (NYSE: OSCR)",
      "Healthcare experience alignment with Kaiser Permanente background"
    ],
    "color": "#F59E0B",
    "angle": 75,
    "distance": 118
  },
  {
    "id": 15,
    "name": "Vetcove",
    "logo": "https://logo.clearbit.com/vetcove.com",
    "careerUrl": "https://vetcove.com/careers",
    "matchScore": 83,
    "industry": "Veterinary eCommerce",
    "stage": "Series A",
    "location": "Brooklyn, NY",
    "employees": "~100",
    "remote": "Fully remote US",
    "openRoles": 1,
    "connections": [
      1,
      6,
      8
    ],
    "connectionTypes": {
      "1": "Marketplace Model",
      "6": "B2B Platform",
      "8": "Growth Stage"
    },
    "matchReasons": [
      "UX Researcher role fully remote - Y Combinator-backed serving 17,000+ hospitals",
      "Y Combinator backing in $50B+ veterinary industry",
      "Mission to help vets spend more time on care vs. procurement",
      "Comprehensive benefits including home office setup"
    ],
    "color": "#F59E0B",
    "angle": 103,
    "distance": 115
  },
  {
    "id": 16,
    "name": "Hinge",
    "logo": "https://logo.clearbit.com/hinge.co",
    "careerUrl": "https://hinge.co/careers",
    "matchScore": 80,
    "industry": "Dating/Social",
    "stage": "Growth Stage",
    "location": "New York, NY",
    "employees": "~400",
    "remote": "Remote with Sr. UX Researcher role",
    "openRoles": 1,
    "connections": [
      7,
      12,
      1
    ],
    "connectionTypes": {
      "1": "Consumer Platform",
      "7": "Behavioral Research",
      "12": "Research Science"
    },
    "matchReasons": [
      "Sr. UX Researcher role focusing on behavioral science and relationship success",
      "Hinge Labs behavioral science research team with PhD researchers",
      "#1 dating app mentioned in NYT weddings",
      "Measurable human connection impact with 75% second-date success"
    ],
    "color": "#F59E0B",
    "angle": 130,
    "distance": 120
  },
  {
    "id": 17,
    "name": "ShopBack",
    "logo": "https://logo.clearbit.com/shopback.com",
    "careerUrl": "https://careers.shopback.com/",
    "matchScore": 78,
    "industry": "eCommerce/Cashback",
    "stage": "Series F",
    "location": "Singapore",
    "employees": "~1200",
    "remote": "Remote-friendly distributed team",
    "openRoles": 1,
    "connections": [
      1,
      15,
      11
    ],
    "connectionTypes": {
      "1": "Marketplace Model",
      "11": "Global Scale",
      "15": "eCommerce Platform"
    },
    "matchReasons": [
      "UX Researcher for fintech/payment products with outstanding distributed research culture",
      "5-person research team across Singapore, Taiwan, South Korea",
      "Serving 40M+ shoppers with $4B+ annual sales",
      "Method-agnostic research approaches with safe improvement culture"
    ],
    "color": "#6B7280",
    "angle": 165,
    "distance": 125
  },
  {
    "id": 18,
    "name": "Netflix",
    "logo": "https://logo.clearbit.com/netflix.com",
    "careerUrl": "https://jobs.netflix.com/",
    "matchScore": 82,
    "industry": "Entertainment/Streaming",
    "stage": "Public",
    "location": "Los Angeles, CA",
    "employees": "~15000",
    "remote": "Hybrid with LA office presence",
    "openRoles": 0,
    "connections": [
      11,
      1,
      4
    ],
    "connectionTypes": {
      "1": "Consumer Research",
      "4": "Experience Design",
      "11": "Content Platform"
    },
    "matchReasons": [
      "Consumer Insights and Experience Design across streaming, games, and live experiences",
      "301.6 million global subscribers with $18B content investment",
      "Los Angeles location ideal for area preference",
      "Research integration across multiple entertainment verticals"
    ],
    "color": "#F59E0B",
    "angle": 195,
    "distance": 122
  },
  {
    "id": 19,
    "name": "Adobe",
    "logo": "https://logo.clearbit.com/adobe.com",
    "careerUrl": "https://careers.adobe.com/",
    "matchScore": 79,
    "industry": "Software/Creative Tools",
    "stage": "Public",
    "location": "San Jose, CA",
    "employees": "~29000",
    "remote": "Hybrid with Bay Area presence",
    "openRoles": 1,
    "connections": [
      4,
      2,
      18
    ],
    "connectionTypes": {
      "2": "Research Excellence",
      "4": "Design Platform",
      "18": "Creative Tools"
    },
    "matchReasons": [
      "Sr Experience Researcher, Adobe Firefly role focusing on AI integration",
      "Nearly 400-person product design group with sophisticated research ops",
      "Fortune 100 Best Companies to Work For 2024",
      "Cutting-edge Firefly AI research challenges"
    ],
    "color": "#6B7280",
    "angle": 225,
    "distance": 130
  }
];

// User profiles with complete exploration state
const teeKProfile: UserExplorationState = {
  id: "tee-k",
  name: "Tee K.",
  cmf: {
  "id": "tee-k",
  "name": "Tee K.",
  "mustHaves": [
    "High Velocity of Execution",
    "Growth-Oriented Environment",
    "People-First Mentality",
    "Remote/Los Angeles/San Diego/Orange County Location"
  ],
  "wantToHave": [
    "Mixed-Method Research Operations Leadership",
    "B2B and B2C Product Experience",
    "Platform/Marketplace Products",
    "Health Tech, Ad Tech, or Ed Tech Experience",
    "Research Program Management Opportunities",
    "Cross-Functional Collaboration and Influence"
  ],
  "experience": [
    "B2B/B2C UX Research",
    "Marketplace Products",
    "VR/AR Experience",
    "HealthTech",
    "AdTech",
    "EdTech",
    "Research Operations"
  ],
  "targetRole": "Senior to Staff UX Researcher or Research Program Manager",
  "targetCompanies": "Series A+ startups and public companies with strong research cultures"
},
  baseCompanies: baseCompanies,
  addedCompanies: [
  {
    "id": 1001,
    "name": "Zapier",
    "logo": "https://logo.clearbit.com/zapier.com",
    "careerUrl": "https://zapier.com/careers",
    "matchScore": 94,
    "industry": "Automation/Integration",
    "stage": "Late Stage",
    "location": "Remote",
    "employees": "~800",
    "remote": "Remote-First",
    "openRoles": 2,
    "connections": [
      5,
      8,
      12
    ],
    "connectionTypes": {
      "5": "B2B Platform",
      "8": "Workflow Tools",
      "12": "Research Platform"
    },
    "matchReasons": [
      "Senior UX Researcher role at fully remote automation platform",
      "Strong research culture with user-centered product development",
      "B2B platform experience with complex integration challenges",
      "Remote-first culture with excellent location flexibility"
    ],
    "color": "#10B981",
    "angle": 285,
    "distance": 89
  },
  {
    "id": 1002,
    "name": "Miro",
    "logo": "https://logo.clearbit.com/miro.com",
    "matchScore": 66,
    "industry": "Collaboration",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 14,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Senior to Staff UX Researcher or Research Program Manager background",
      "Excellent fit in the Collaboration industry",
      "Company culture aligns with your requirement: Remote/Los Angeles/San Diego/Orange County Location",
      "Technology stack matches your experience"
    ],
    "color": "#6B7280",
    "angle": 167.52891216722014,
    "distance": 175,
    "careerUrl": "https://miro.com/careers"
  },
  {
    "id": 1003,
    "name": "Stripe",
    "logo": "https://logo.clearbit.com/stripe.com",
    "matchScore": 72,
    "industry": "Fintech",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 19,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Senior to Staff UX Researcher or Research Program Manager background",
      "Excellent fit in the Fintech industry",
      "Company culture aligns with your requirement: Remote/Los Angeles/San Diego/Orange County Location",
      "Technology stack matches your experience"
    ],
    "color": "#3B82F6",
    "angle": 348.9595088763521,
    "distance": 155,
    "careerUrl": "https://stripe.com/careers"
  },
  {
    "id": 1004,
    "name": "Canva",
    "logo": "https://logo.clearbit.com/canva.com",
    "matchScore": 79,
    "industry": "Design",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 18,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Senior to Staff UX Researcher or Research Program Manager background",
      "Excellent fit in the Design industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Innovative approach to solving problems"
    ],
    "color": "#3B82F6",
    "angle": 223.86140528811066,
    "distance": 175,
    "careerUrl": "https://canva.com/careers"
  },
  {
    "id": 1005,
    "name": "biodiversity",
    "logo": "https://logo.clearbit.com/biodiversity.com",
    "matchScore": 65,
    "industry": "Healthcare",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 6,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Senior to Staff UX Researcher or Research Program Manager background",
      "Excellent fit in the Healthcare industry",
      "Company culture aligns with your requirement: People-First Mentality",
      "Innovative approach to solving problems"
    ],
    "color": "#6B7280",
    "angle": 318.41839614219543,
    "distance": 175,
    "careerUrl": "https://biodiversity.com/careers"
  }
],
  removedCompanyIds: [
  17,
  19,
  1005,
  1004
],
  watchlistCompanyIds: [
  3,
  4,
  7,
  1001,
  2,
  12,
  1003,
  1
],
  lastSelectedCompanyId: undefined,
  viewMode: 'explore'
};

// Export the current active user (manually switch by changing this line)
export const activeUserProfile = teeKProfile;

// Legacy exports for compatibility
export const sampleUserCMF = activeUserProfile.cmf;
export const sampleCompanies = activeUserProfile.baseCompanies;

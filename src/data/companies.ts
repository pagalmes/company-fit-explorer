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
  }
];

// User profiles with complete exploration state
const teeKProfile: UserExplorationState = {
  id: "pag",
  name: "Pierre",
  cmf: {
  "id": "pag",
  "name": "Pierre",
  "mustHaves": [
    "High Velocity of Execution",
    "Growth-Oriented Environment",
    "People-First Mentality",
    "Remote/Los Angeles/San Diego/Orange County Location"
  ],
  "wantToHave": [
    "Cross-Functional Collaboration and Influence"
  ],
  "experience": [
    "Marketplace Products"
  ],
  "targetRole": "Group PM to Director, Product Management",
  "targetCompanies": "Series A+ startups and public companies"
},
  baseCompanies: baseCompanies,
  addedCompanies: [
  {
    "id": 1001,
    "name": "Smartsheet",
    "logo": "https://logo.clearbit.com/smartsheet.com",
    "matchScore": 66,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 15,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Company growth trajectory looks promising"
    ],
    "color": "#6B7280",
    "angle": 107.46924375475392,
    "distance": 175,
    "careerUrl": "https://smartsheet.com/careers"
  },
  {
    "id": 1002,
    "name": "docusign",
    "logo": "https://logo.clearbit.com/docusign.com",
    "matchScore": 65,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 17,
    "connections": [
      1001
    ],
    "connectionTypes": {
      "1001": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Technology stack matches your experience"
    ],
    "color": "#6B7280",
    "angle": 256.76840557097995,
    "distance": 175,
    "careerUrl": "https://docusign.com/careers"
  },
  {
    "id": 1003,
    "name": "Zendesk",
    "logo": "https://logo.clearbit.com/zendesk.com",
    "matchScore": 75,
    "industry": "Customer Support",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 17,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Customer Support industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Company growth trajectory looks promising"
    ],
    "color": "#3B82F6",
    "angle": 132.36552026519948,
    "distance": 135,
    "careerUrl": "https://zendesk.com/careers"
  },
  {
    "id": 1004,
    "name": "confluent",
    "logo": "https://logo.clearbit.com/confluent.io",
    "matchScore": 78,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 15,
    "connections": [
      1001,
      1002
    ],
    "connectionTypes": {
      "1001": "Industry Peer",
      "1002": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Company growth trajectory looks promising"
    ],
    "color": "#3B82F6",
    "angle": 166.56411916095223,
    "distance": 135,
    "careerUrl": "https://confluent.io/careers"
  },
  {
    "id": 1005,
    "name": "servicenow",
    "logo": "https://logo.clearbit.com/servicenow.com",
    "matchScore": 68,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 11,
    "connections": [
      1004,
      1001
    ],
    "connectionTypes": {
      "1001": "Industry Peer",
      "1004": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: Growth-Oriented Environment",
      "Innovative approach to solving problems"
    ],
    "color": "#6B7280",
    "angle": 318.90394248769036,
    "distance": 175,
    "careerUrl": "https://servicenow.com/careers"
  },
  {
    "id": 1006,
    "name": "elastic",
    "logo": "https://logo.clearbit.com/elastic.co",
    "matchScore": 79,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 14,
    "connections": [
      1004,
      1005
    ],
    "connectionTypes": {
      "1004": "Industry Peer",
      "1005": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: People-First Mentality",
      "Innovative approach to solving problems"
    ],
    "color": "#3B82F6",
    "angle": 65.03272487569146,
    "distance": 135,
    "careerUrl": "https://elastic.co/careers"
  },
  {
    "id": 1007,
    "name": "paylocity",
    "logo": "https://logo.clearbit.com/paylocity.com",
    "matchScore": 68,
    "industry": "Fintech",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 18,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Fintech industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Company growth trajectory looks promising"
    ],
    "color": "#6B7280",
    "angle": 7.601972719643508,
    "distance": 175,
    "careerUrl": "https://paylocity.com/careers"
  },
  {
    "id": 1008,
    "name": "adp",
    "logo": "https://logo.clearbit.com/adp.com",
    "matchScore": 74,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 8,
    "connections": [
      1006,
      1004
    ],
    "connectionTypes": {
      "1004": "Industry Peer",
      "1006": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: High Velocity of Execution",
      "Technology stack matches your experience"
    ],
    "color": "#3B82F6",
    "angle": 224.91227322672742,
    "distance": 155,
    "careerUrl": "https://adp.com/careers"
  },
  {
    "id": 1009,
    "name": "workday",
    "logo": "https://logo.clearbit.com/workday.com",
    "matchScore": 74,
    "industry": "Technology",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 15,
    "connections": [
      1006,
      1004
    ],
    "connectionTypes": {
      "1004": "Industry Peer",
      "1006": "Industry Peer"
    },
    "matchReasons": [
      "Strong alignment with your Group PM to Director, Product Management background",
      "Excellent fit in the Technology industry",
      "Company culture aligns with your requirement: Growth-Oriented Environment",
      "Innovative approach to solving problems"
    ],
    "color": "#3B82F6",
    "angle": 284.23183826677337,
    "distance": 155,
    "careerUrl": "https://workday.com/careers"
  },
  {
    "id": 1010,
    "name": "Crunchyroll",
    "logo": "https://logo.clearbit.com/crunchyroll.com",
    "matchScore": 82,
    "industry": "Media & Entertainment (Anime Streaming)",
    "stage": "Public (via Sony)",
    "location": "San Francisco, CA",
    "employees": "1000-5000",
    "remote": "Hybrid",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong product-led growth environment with high execution velocity",
      "Significant presence in Los Angeles and San Francisco",
      "Extensive cross-functional collaboration in content, tech, and business teams",
      "Marketplace experience relevant (content licensing, user subscriptions)",
      "Global scale with strong growth trajectory"
    ],
    "color": "#F59E0B",
    "angle": 339.3768100415951,
    "distance": 115,
    "careerUrl": "https://crunchyroll.com/careers"
  },
  {
    "id": 1011,
    "name": "Wikimedia Foundation",
    "logo": "https://logo.clearbit.com/wikimedia.com",
    "matchScore": 75,
    "industry": "Technology/Non-Profit",
    "stage": "Mature",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 8,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong remote-first culture with distributed teams globally",
      "High emphasis on cross-functional collaboration",
      "Mission-driven organization with people-first culture",
      "Product roles involve complex stakeholder management"
    ],
    "color": "#3B82F6",
    "angle": 31.84173247185663,
    "distance": 135,
    "careerUrl": "https://wikimedia.com/careers"
  },
  {
    "id": 1012,
    "name": "Valon",
    "logo": "https://logo.clearbit.com/valon.com",
    "matchScore": 75,
    "industry": "Fintech",
    "stage": "Late Stage",
    "location": "New York, NY",
    "employees": "100-250",
    "remote": "Remote-Friendly",
    "openRoles": 8,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Growth-oriented fintech with strong execution focus",
      "Remote-friendly culture with emphasis on collaboration",
      "Product-led company with marketplace dynamics in mortgage servicing",
      "Strong emphasis on engineering and product excellence"
    ],
    "color": "#3B82F6",
    "angle": 195.63406712110327,
    "distance": 135,
    "careerUrl": "https://valon.com/careers"
  },
  {
    "id": 1013,
    "name": "Stripe",
    "logo": "https://logo.clearbit.com/stripe.com",
    "matchScore": 88,
    "industry": "Fintech",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "8000-9000",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong remote work culture with distributed teams globally",
      "High-velocity product development environment with rapid iteration cycles",
      "Extensive marketplace experience through Connect and payment processing products",
      "Strong emphasis on cross-functional collaboration and engineering culture",
      "Multiple PM roles available at various levels including Senior/Group PM"
    ],
    "color": "#F59E0B",
    "angle": 249.99687620619287,
    "distance": 100,
    "careerUrl": "https://stripe.com/careers"
  },
  {
    "id": 1014,
    "name": "Square",
    "logo": "https://logo.clearbit.com/square.com",
    "matchScore": 82,
    "industry": "Fintech",
    "stage": "Public",
    "location": "San Francisco, CA",
    "employees": "12000+",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [
      1013
    ],
    "connectionTypes": {
      "1013": "Direct Competitor"
    },
    "matchReasons": [
      "Strong marketplace product experience with Square's seller ecosystem",
      "High-velocity execution culture with rapid product iteration",
      "Significant cross-functional collaboration opportunities across payments, banking, and commerce",
      "Remote-friendly policy matches location preferences",
      "Product leadership roles regularly available at Group PM to Director level"
    ],
    "color": "#F59E0B",
    "angle": 223,
    "distance": 175,
    "careerUrl": "https://square.com/careers"
  },
  {
    "id": 1015,
    "name": "Roku",
    "logo": "https://logo.clearbit.com/roku.com",
    "matchScore": 82,
    "industry": "Streaming Media & Entertainment Technology",
    "stage": "Public",
    "location": "San Jose, CA",
    "employees": "~3500",
    "remote": "Hybrid",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong product-driven culture with high execution velocity",
      "Multiple PM roles across streaming, advertising, and platform products",
      "Has offices in key target locations (Los Angeles, San Diego)",
      "Significant marketplace experience with content/advertising platforms",
      "Strong emphasis on cross-functional collaboration"
    ],
    "color": "#F59E0B",
    "angle": 315,
    "distance": 115,
    "careerUrl": "https://roku.com/careers"
  },
  {
    "id": 1016,
    "name": "Descript",
    "logo": "https://logo.clearbit.com/descript.com",
    "matchScore": 82,
    "industry": "AI/ML - Audio/Video Production",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~300",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [
      1015
    ],
    "connectionTypes": {
      "1015": "Direct Competitor"
    },
    "matchReasons": [
      "Strong growth trajectory with recent $50M Series C funding",
      "Remote-friendly culture matches location preferences",
      "Product-led company with high execution velocity",
      "Strong emphasis on cross-functional collaboration in product teams"
    ],
    "color": "#F59E0B",
    "angle": 308,
    "distance": 115,
    "careerUrl": "https://descript.com/careers"
  },
  {
    "id": 1017,
    "name": "Snowflake",
    "logo": "https://logo.clearbit.com/snowflake.com",
    "matchScore": 82,
    "industry": "Cloud Data/Analytics",
    "stage": "Public",
    "location": "Bozeman, MT (HQ), Multiple US Offices",
    "employees": "~7000",
    "remote": "Hybrid",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth environment with 100%+ YoY revenue growth",
      "Significant product expansion opportunities across data cloud ecosystem",
      "Multiple office locations including LA area with hybrid flexibility",
      "Heavy emphasis on cross-functional collaboration in product org",
      "Data marketplace experience aligns with candidate's marketplace background"
    ],
    "color": "#F59E0B",
    "angle": 295,
    "distance": 115,
    "careerUrl": "https://snowflake.com/careers"
  },
  {
    "id": 1018,
    "name": "Airtable",
    "logo": "https://logo.clearbit.com/airtable.com",
    "matchScore": 82,
    "industry": "SaaS/Productivity",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~1000",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong product-led growth environment with high execution velocity",
      "Remote-friendly culture with distributed team structure",
      "Significant cross-functional collaboration in product development",
      "Platform/marketplace elements in app marketplace ecosystem",
      "Strong emphasis on people-first culture and employee development"
    ],
    "color": "#F59E0B",
    "angle": 304,
    "distance": 115,
    "careerUrl": "https://airtable.com/careers"
  },
  {
    "id": 1019,
    "name": "Vercel",
    "logo": "https://logo.clearbit.com/vercel.com",
    "matchScore": 82,
    "industry": "Developer Tools/Cloud Infrastructure",
    "stage": "Late Stage",
    "location": "San Francisco, CA",
    "employees": "~500",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong execution velocity with rapid product iterations and deployments",
      "Growth-oriented environment with significant market expansion",
      "Remote-first culture with global team distribution",
      "Extensive cross-functional collaboration between product, engineering, and developer relations"
    ],
    "color": "#F59E0B",
    "angle": 285,
    "distance": 115,
    "careerUrl": "https://vercel.com/careers"
  },
  {
    "id": 1020,
    "name": "Miro",
    "logo": "https://logo.clearbit.com/miro.com",
    "matchScore": 88,
    "industry": "Collaboration Software/SaaS",
    "stage": "Late Stage",
    "location": "San Francisco, CA & Amsterdam",
    "employees": "~1500",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong remote-first culture with global presence including LA/SD offices",
      "High-growth environment with rapid product iteration and launches",
      "Heavy emphasis on cross-functional collaboration in product development",
      "Platform features include marketplace components matching experience",
      "Strong people-first culture with emphasis on employee development"
    ],
    "color": "#F59E0B",
    "angle": 94.88696455210118,
    "distance": 100,
    "careerUrl": "https://miro.com/careers"
  },
  {
    "id": 1021,
    "name": "Hugging Face",
    "logo": "https://logo.clearbit.com/huggingface.co",
    "matchScore": 88,
    "industry": "AI/ML",
    "stage": "Late Stage",
    "location": "New York, NY",
    "employees": "~400",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth trajectory and high execution velocity in AI/ML space",
      "Remote-first culture with significant product management opportunities",
      "Platform operates as a marketplace for AI models and datasets",
      "Highly collaborative environment with emphasis on open source community"
    ],
    "color": "#F59E0B",
    "angle": 195.6889682540203,
    "distance": 100,
    "careerUrl": "https://huggingface.co/careers"
  },
  {
    "id": 1022,
    "name": "Peugeot",
    "logo": "https://logo.clearbit.com/peugeot.com",
    "matchScore": 45,
    "industry": "Automotive Manufacturing",
    "stage": "Public",
    "location": "Paris, France",
    "employees": "200,000+ (as part of Stellantis)",
    "remote": "Hybrid",
    "openRoles": 8,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Global presence offers cross-functional collaboration opportunities",
      "Established product management structure",
      "Digital transformation initiatives creating new PM opportunities"
    ],
    "color": "#6B7280",
    "angle": 342.2984901220017,
    "distance": 195,
    "careerUrl": "https://peugeot.com/careers"
  },
  {
    "id": 1023,
    "name": "Twilio",
    "logo": "https://logo.clearbit.com/twillio.com",
    "matchScore": 82,
    "industry": "Communications/Cloud API",
    "stage": "Public",
    "location": "San Francisco, CA",
    "employees": "~7000",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong remote work culture with distributed teams",
      "High-velocity product development environment",
      "Significant cross-functional collaboration in platform products",
      "Developer-focused marketplace ecosystem experience relevant",
      "Strong growth trajectory despite market conditions"
    ],
    "color": "#F59E0B",
    "angle": 269,
    "distance": 115,
    "careerUrl": "https://twillio.com/careers"
  },
  {
    "id": 1024,
    "name": "Slack",
    "logo": "https://logo.clearbit.com/slack.com",
    "matchScore": 82,
    "industry": "Enterprise Software/Communication",
    "stage": "Public",
    "location": "San Francisco, CA",
    "employees": "3000-5000",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [
      1015
    ],
    "connectionTypes": {
      "1015": "Industry Partner"
    },
    "matchReasons": [
      "Strong remote-first culture with distributed teams",
      "High velocity product development environment",
      "Extensive cross-functional collaboration opportunities",
      "People-first company culture with strong emphasis on user experience",
      "Product complexity allows for significant PM growth"
    ],
    "color": "#F59E0B",
    "angle": 2,
    "distance": 115,
    "careerUrl": "https://slack.com/careers"
  },
  {
    "id": 1025,
    "name": "GitHub",
    "logo": "https://logo.clearbit.com/github.com",
    "matchScore": 88,
    "industry": "Developer Tools & Collaboration",
    "stage": "Public (Microsoft subsidiary)",
    "location": "San Francisco, CA",
    "employees": "~3000",
    "remote": "Remote-Friendly",
    "openRoles": 25,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong remote-first culture with flexibility across US locations",
      "Marketplace product experience directly relevant (GitHub Marketplace)",
      "High velocity environment with significant cross-functional collaboration",
      "People-first culture with emphasis on developer experience and community",
      "Product roles frequently available at senior and director levels"
    ],
    "color": "#F59E0B",
    "angle": 148,
    "distance": 100,
    "careerUrl": "https://github.com/careers"
  },
  {
    "id": 1026,
    "name": "Addepar",
    "logo": "https://logo.clearbit.com/addepar.com",
    "matchScore": 78,
    "industry": "Fintech",
    "stage": "Late Stage",
    "location": "Mountain View, CA",
    "employees": "500-1000",
    "remote": "Hybrid",
    "openRoles": 8,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth trajectory with established market presence",
      "Product-led company with emphasis on technical innovation",
      "Offers flexible work arrangements including remote options",
      "Complex product ecosystem requiring strong PM leadership"
    ],
    "color": "#3B82F6",
    "angle": 117,
    "distance": 125,
    "careerUrl": "https://addepar.com/careers"
  },
  {
    "id": 1027,
    "name": "Stability AI",
    "logo": "https://logo.clearbit.com/stability.ai",
    "matchScore": 78,
    "industry": "AI/ML",
    "stage": "Late Stage",
    "location": "London, UK (with offices in San Francisco, CA)",
    "employees": "~100-200",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth trajectory and high execution velocity in AI space",
      "Remote-friendly culture with global presence including US operations",
      "Cross-functional collaboration essential in AI product development",
      "Product-led company with significant technical innovation focus"
    ],
    "color": "#3B82F6",
    "angle": 50,
    "distance": 135,
    "careerUrl": "https://stability.ai/careers"
  },
  {
    "id": 1028,
    "name": "Cepheid",
    "logo": "https://logo.clearbit.com/cepheid.com",
    "matchScore": 72,
    "industry": "Healthcare Technology/Diagnostics",
    "stage": "Public (Acquired by Danaher)",
    "location": "Sunnyvale, CA",
    "employees": "3000-5000",
    "remote": "Hybrid",
    "openRoles": 8,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth environment with continuous product innovation",
      "Significant cross-functional collaboration in medical device development",
      "Established presence in Southern California with hybrid work options",
      "Complex product ecosystem requires strong PM leadership"
    ],
    "color": "#3B82F6",
    "angle": 83,
    "distance": 155,
    "careerUrl": "https://cepheid.com/careers"
  },
  {
    "id": 1029,
    "name": "Flock",
    "logo": "https://logo.clearbit.com/flock.com",
    "matchScore": 82,
    "industry": "HR Tech/Insurance",
    "stage": "Series C",
    "location": "San Francisco, CA",
    "employees": "~400",
    "remote": "Remote-Friendly",
    "openRoles": 12,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Strong growth trajectory with recent $150M Series C funding",
      "Remote-friendly culture matches location preferences",
      "Product-led company with high execution velocity",
      "Strong cross-functional collaboration in building HR/benefits platform"
    ],
    "color": "#F59E0B",
    "angle": 224,
    "distance": 105,
    "careerUrl": "https://flock.com/careers"
  },
  {
    "id": 1030,
    "name": "Flock Freight",
    "logo": "https://logo.clearbit.com/flockfreight.com",
    "matchScore": 88,
    "industry": "Logistics/Transportation Technology",
    "stage": "Late Stage",
    "location": "Encinitas, CA",
    "employees": "~500",
    "remote": "Hybrid",
    "openRoles": 12,
    "connections": [],
    "connectionTypes": {},
    "matchReasons": [
      "Location matches target areas (San Diego County)",
      "Strong marketplace product focus with their freight pooling platform",
      "High-growth environment with Series D funding ($215M raised in 2021)",
      "Significant cross-functional collaboration between product, operations, and sales teams",
      "Technology-driven logistics platform matches marketplace experience"
    ],
    "color": "#F59E0B",
    "angle": 213,
    "distance": 100,
    "careerUrl": "https://flockfreight.com/careers"
  }
],
  removedCompanyIds: [
  17,
  19,
  1,
  1018,
  1022,
  1019,
  1016,
  1014,
  1028,
  1029
],
  watchlistCompanyIds: [
  3,
  4,
  7,
  1001,
  2,
  12,
  1003,
  11,
  1010,
  1026,
  1013
],
  lastSelectedCompanyId: undefined,
  viewMode: 'explore'
};

// Export the current active user (manually switch by changing this line)
export const activeUserProfile = teeKProfile;

// Legacy exports for compatibility
export const sampleUserCMF = activeUserProfile.cmf;
export const sampleCompanies = activeUserProfile.baseCompanies;

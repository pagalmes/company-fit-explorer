# Cosmos - Product Overview

## **Product Concept**
Cosmos is an interactive visualization tool that helps professionals discover and evaluate companies that align with their career goals. It uses a Candidate Market Fit (CMF) approach to position companies in a visual graph based on how well they match the user's preferences, requirements, and career aspirations.

## **Core Value Proposition**
Instead of browsing endless company lists or job boards, users get a personalized, visual map of their career opportunities with companies positioned based on actual fit scores and relationships to their professional profile.

---

## **Current Features & Capabilities**

### **1. CMF-Centered Visualization**
- **Your profile at the center**: User's CMF profile sits in the middle as the anchor point
- **Radial company positioning**: Companies arranged in precise circles around the CMF based on match scores
- **Distance indicates fit**: Closer companies = better matches, farther = lower matches
- **Color-coded quality zones**: Visual background zones for excellent (90%+), good (80%+), and fair matches

### **2. Interactive Company Discovery**
- **Click to explore**: Tap any company node to see detailed information
- **Hover relationships**: Mouse over companies to see their network connections
- **Connection highlighting**: Visual lines show relationships between companies
- **Smart filtering**: Connected companies highlight when exploring relationships

### **3. Detailed Company Intelligence**
Each company profile includes:
- **Match scoring**: Percentage fit with detailed reasoning
- **Company basics**: Industry, stage, location, team size
- **Work arrangements**: Remote policies and office locations  
- **Opportunity data**: Number of open roles
- **Network context**: How this company connects to others in your space
- **Direct job access**: Functional "View Jobs" button opens career pages

### **4. Professional Network Mapping**
- **AI/ML Competitors**: Companies in similar technology spaces
- **Culture Alignment**: Organizations with comparable values
- **Platform Strategy**: Companies with API/infrastructure focus
- **Research Focus**: Research-oriented organizations
- **Industry Clusters**: Related companies in same sectors

---

## **User Experience Flow**

### **1. Initial View**
- User sees their CMF profile in the center
- Companies arranged around them by fit score
- Can immediately identify top matches (closest, green zone)
- Visual overview of entire opportunity landscape

### **2. Exploration**
- Hover over companies to see relationships and connections
- Click companies to dive deep into specific opportunities
- Use zoom/pan controls to focus on different areas
- Follow connection lines to discover related opportunities

### **3. Deep Dive**
- Company detail panel shows comprehensive information
- Match reasons explain why this company fits
- Direct link to apply via "View Jobs" button
- Related companies suggest similar opportunities

---

## **Technical Architecture**

### **Frontend Stack**
- **React 18 + TypeScript**: Modern, type-safe frontend
- **Next.js**: Full-stack React framework with optimized builds
- **Tailwind CSS**: Utility-first styling system
- **Cytoscape.js**: Powerful graph visualization engine

### **Data Structure**
- **CMF Profile**: User's requirements, preferences, and experience
- **Company Database**: Rich company data with match scoring
- **Relationship Graph**: Network connections between companies
- **Positioning Algorithm**: Precise mathematical placement

### **Key Components**
- **CMFGraphExplorer**: Main container and state management
- **CompanyGraph**: Cytoscape visualization with interactions
- **CompanyDetailPanel**: Detailed company information sidebar

---

## **Data-Driven Approach**

### **CMF Profile Structure**
- **Must Haves**: Non-negotiable requirements (e.g., remote work, high velocity)
- **Want to Have**: Nice-to-have preferences (e.g., AI/ML focus, technical innovation)
- **Experience**: Relevant background areas (e.g., gaming, payments, data pipelines)
- **Target Role**: Desired position level and focus
- **Company Preferences**: Stage, size, and industry preferences

### **Company Intelligence**
- **Match Scoring**: 0-100% based on alignment with CMF
- **Detailed Reasoning**: Specific explanations for why companies match
- **Real-World Data**: Actual company information, locations, team sizes
- **Live Job Links**: Direct connections to career pages
- **Network Relationships**: How companies connect to each other

---

## **Current Dataset Example**
The app currently features 15 companies optimized for AI Trust & Safety Product Management roles:

**Top Matches (90%+)**:
- OpenAI (95%) - AI safety systems roles
- Anthropic (94%) - AI safety research focus  
- Roblox (92%) - Trust & Safety PM for gaming platform

**Strong Matches (80-89%)**:
- Microsoft (89%) - Responsible AI PM roles
- Coinbase (88%) - AI trust & safety development
- Discord (87%) - Trust & Safety for communication platform

**Good Options (70-79%)**:
- Google, Twitch, Salesforce, Epic Games, Scale AI, Intuit

---

## **Immediate Business Value**

### **For Job Seekers**
- **Personalized discovery**: Find companies that actually fit your profile
- **Relationship mapping**: Understand the ecosystem of opportunities
- **Efficient exploration**: Visual overview prevents missing good fits
- **Direct application**: One-click access to job applications

### **For Career Coaches/Recruiters**
- **Client consultation tool**: Visual way to discuss career options
- **Opportunity mapping**: Show clients their full landscape
- **Relationship insights**: Help clients understand industry connections
- **Data-driven recommendations**: Evidence-based career advice

### **For Companies**
- **Talent mapping**: Understand how they fit in candidate's landscape
- **Competitive positioning**: See how they compare to similar companies
- **Recruitment strategy**: Target candidates with specific CMF profiles

---

## **Future Enhancement Opportunities**

### **Dynamic Personalization**
- **User input interface**: Allow users to customize their CMF profile
- **Real-time matching**: Update scores based on profile changes
- **Multiple profiles**: Support different career path explorations

### **Enhanced Data**
- **Live job integration**: Pull real-time job postings
- **Salary data**: Include compensation information
- **Interview insights**: Add interview process information
- **Employee reviews**: Integrate culture and experience data

### **Advanced Features**
- **Career path modeling**: Show progression opportunities
- **Network effects**: Leverage user connections and referrals
- **Market trends**: Include industry growth and opportunity data
- **Application tracking**: Help users manage their job search process

---

## **Technical Implementation Status**

### **✅ Completed Features**
- CMF-centered graph visualization
- Interactive company nodes with hover/click states
- Company detail panel with comprehensive information
- Functional "View Jobs" button with career page links
- Connection highlighting and relationship mapping
- Responsive design with zoom/pan controls
- Match quality zones and color coding
- TypeScript type safety throughout

### **🔧 Current Architecture**
- React 18 with TypeScript for type safety
- Cytoscape.js for graph visualization
- Tailwind CSS for styling
- Static data structure with 15 curated companies
- Mathematical positioning algorithm for precise placement

This product represents a novel approach to career exploration that combines data-driven insights with intuitive visual discovery, making the job search process more strategic and personalized.
# Admin Features

## User Company Data Import

The admin interface provides functionality to import user company data and profiles. This feature is designed for setting up test users, migrating data, or replacing corrupted profiles.

### Access

Admin features are available at `/admin` route when authenticated.

### Import Format

The import function accepts JSON data in **UserExplorationState** format:

```json
{
  "id": "user-id",
  "name": "User Name", 
  "cmf": {
    "id": "user-id",
    "name": "User Name",
    "targetRole": "Senior UX Researcher",
    "mustHaves": ["Remote Work", "Growth Culture"],
    "wantToHave": ["Research Operations", "B2B Experience"],
    "experience": ["UX Research", "Product Strategy"],
    "targetCompanies": "Series A+ startups"
  },
  "baseCompanies": [
    {
      "id": 1,
      "name": "Company Name",
      "logo": "https://logo.clearbit.com/company.com",
      "matchScore": 95,
      "industry": "Technology",
      "stage": "Series B",
      "location": "San Francisco, CA",
      "employees": "100-500",
      "remote": "Remote-First",
      "openRoles": 3,
      "connections": [2, 5, 8],
      "connectionTypes": {
        "2": "Culture Match",
        "5": "Tech Stack", 
        "8": "Growth Stage"
      },
      "matchReasons": [
        "Strong research culture with dedicated UX team",
        "Remote-first policy matches location preferences"
      ],
      "color": "#10B981",
      "angle": 45,
      "distance": 80
    }
  ],
  "addedCompanies": [],
  "watchlistCompanyIds": [1, 3, 5],
  "removedCompanyIds": [10, 15],
  "viewMode": "explore"
}
```

### Legacy Format Support

Also supports legacy format for backward compatibility:
```json
{
  "userProfile": { /* CMF data */ },
  "companies": [ /* array of companies */ ],
  "watchlistCompanyIds": [],
  "removedCompanyIds": []
}
```

### Import Behavior

**⚠️ IMPORTANT: Import completely replaces existing user data**

- **Complete replacement**: All existing user data is overwritten
- **No merging**: Existing companies, CMF profile, and preferences are lost
- **No backup**: Previous data is not preserved
- **Immediate effect**: Changes take effect immediately for the target user

### Data Structure Handling

- **UserExplorationState Format**: Preserves distinction between `baseCompanies` and `addedCompanies`
- **Legacy Format**: Converts to structured format automatically  
- **Database Storage**: Companies are flattened for storage while preserving structure in user profile
- **CMF Integration**: User CMF profile is properly extracted and loaded in the application

### Test Data

Complete test data is available at:
- `src/data/companies-test-data-complete.json` - Full dataset with 25 companies (19 base + 6 added)

This file contains realistic test data including:
- Complete CMF profile for "Theresa K."
- 19 base companies with detailed match information
- 6 added companies 
- Watchlist and removed company tracking
- Full company details (logos, career URLs, match scores, etc.)

### Usage Notes

- Designed for admin/testing purposes
- Requires authentication to access admin interface
- Use with caution as it permanently overwrites user data
- Ideal for setting up demo accounts or migrating user profiles
# Supabase Dashboard Security Settings

## 🔧 Settings to Configure in Supabase Dashboard

### **1. Enable Leaked Password Protection**

**Location**: Authentication → Settings → Security
- ✅ **Enable "Password leak protection"**
- This prevents users from using passwords found in data breaches

### **2. Configure MFA Options**

**Location**: Authentication → Settings → Multi-Factor Authentication  
- ✅ **Enable TOTP (Time-based One-Time Passwords)**
- ✅ **Enable Phone/SMS verification** (if needed)
- ✅ **Consider enabling WebAuthn** for hardware keys

### **3. Update Postgres Version**

**Location**: Settings → Database → Configuration
- ✅ **Check for available updates**
- ✅ **Schedule maintenance window** for the update
- ⚠️ **Note**: This requires downtime, plan accordingly

### **4. Additional Security Settings**

**Location**: Authentication → Settings

#### **Password Policy**
- ✅ **Minimum password length**: 8+ characters
- ✅ **Require uppercase letters**: Enabled
- ✅ **Require numbers**: Enabled
- ✅ **Require special characters**: Enabled

#### **Session Management**
- ✅ **Session timeout**: 24 hours (or shorter for sensitive apps)
- ✅ **Refresh token rotation**: Enabled
- ✅ **Reuse interval**: 10 seconds

#### **Rate Limiting**
- ✅ **Email rate limit**: 3-5 per hour
- ✅ **SMS rate limit**: 2-3 per hour (if using SMS)
- ✅ **Sign in attempts**: 5 attempts per 15 minutes

### **5. Email Settings**

**Location**: Authentication → Settings → Email Templates

- ✅ **Enable email confirmation**
- ✅ **Require email confirmation for sign up**
- ✅ **Custom email templates** (optional, for branding)

### **6. URL Configuration**

**Location**: Authentication → Settings → URL Configuration

- ✅ **Site URL**: Set to your production domain
- ✅ **Redirect URLs**: Only include trusted domains
- ✅ **Remove localhost URLs** in production

## 🔍 How to Apply These Settings

1. **Go to your Supabase Dashboard**
2. **Navigate to each section listed above**
3. **Enable the recommended settings**
4. **Test your application** after making changes

## ⚠️ Important Notes

### **Before Updating Postgres:**
- ✅ Create a database backup
- ✅ Test in a staging environment first
- ✅ Schedule during low-traffic periods
- ✅ Notify users of potential downtime

### **Testing After Changes:**
- ✅ Test user registration
- ✅ Test password reset flow
- ✅ Test login with various password strengths
- ✅ Verify admin functions still work

### **MFA Considerations:**
- ✅ Provide clear user instructions
- ✅ Offer backup recovery codes
- ✅ Consider making MFA optional initially
- ✅ Monitor user adoption rates

## 📊 Security Monitoring

After implementing these changes:

1. **Monitor the Security Advisor** regularly
2. **Review audit logs** (created by our SQL script)
3. **Check authentication metrics** in Dashboard
4. **Set up alerts** for suspicious activity

## 🆘 If Something Breaks

### **Emergency Rollback:**
1. **Disable the problematic setting** in the dashboard
2. **Check Supabase logs** for error details
3. **Test core functionality** (login, signup, data access)
4. **Re-enable settings gradually** once fixed

### **Common Issues:**
- **MFA blocks legitimate users**: Provide clear setup instructions
- **Password policy too strict**: Adjust requirements gradually
- **Rate limiting too aggressive**: Monitor and adjust limits
- **URL configuration blocks access**: Ensure all production URLs are whitelisted

## ✅ Completion Checklist

- [ ] Leaked password protection enabled
- [ ] MFA options configured
- [ ] Password policy strengthened
- [ ] Session management optimized
- [ ] Rate limiting configured
- [ ] Email confirmation enabled
- [ ] URL configuration secured
- [ ] Postgres version updated (scheduled)
- [ ] All functionality tested
- [ ] Team notified of changes
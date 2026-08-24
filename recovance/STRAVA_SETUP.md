# Strava API Integration & Burnout Calculator Setup

This guide explains how to set up the Strava API integration and use the burnout calculator in your Recovance app.

## 🔐 Strava API Setup

### 1. Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application with the following details:

   - **Application Name**: Recovance
   - **Category**: Analytics
   - **Website**: Your app URL (e.g., `http://localhost:3000`)
   - **Authorization Callback Domain**: Your domain (e.g., `localhost` for development)

3. Note down your **Client ID** and **Client Secret**

### 2. Environment Variables

Copy `example.env` to `.env.local` and fill in your values (see `example.env`
for the full list, including Oura and WHOOP OAuth credentials):

```bash
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
OURA_API_TOKEN=your_oura_token_here
```

### 3. Get Strava Access Token

#### Option A: Built-in OAuth Flow (Recommended)

1. Open the app and go to `/connect`
2. Click **Connect** next to Strava — you will be redirected to Strava to
   authorize the app
3. After you approve, tokens are stored in your browser and refreshed
   automatically when they expire

Under the hood this uses:

- `GET /api/auth/strava/login` – redirects to Strava's authorization page
- `GET /api/auth/strava/callback` – exchanges the code for tokens
- `POST /api/auth/strava/refresh` – refreshes expired access tokens

The same flow exists for Oura (`/api/auth/oura/...`) and WHOOP
(`/api/auth/whoop/...`).

#### Option B: Manual Token Generation (For Development/Testing)

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Scroll down to "Your Access Token"
3. Click "Generate Token"
4. Copy the generated access token

## 🧮 Burnout Calculator

The burnout calculator combines multiple data sources to assess your risk of overtraining and burnout:

### Formula

```
burnout_score =
  weight_acwr * acwr_score +
  weight_hrv * hrv_drop_score +
  weight_rhr * resting_hr_score +
  weight_sleep * sleep_debt_score +
  weight_streak * training_streak_score +
  weight_subjective * perceived_exertion_score
```

### Default Weights

- **ACWR (Acute:Chronic Workload Ratio)**: 30%
- **HRV Drop**: 20%
- **Resting Heart Rate**: 15%
- **Sleep Debt**: 20%
- **Training Streak**: 10%
- **Perceived Exertion**: 5%

### Risk Levels

- **Low Risk**: 0.0 - 0.3 (Green)
- **Moderate Risk**: 0.3 - 0.6 (Yellow)
- **High Risk**: 0.6 - 1.0 (Red)

## 📊 Data Sources

### 1. Strava Activities

- **ACWR Calculation**: Uses 7-day vs 28-day workload ratios
- **Training Streak**: Tracks consecutive days with activities
- **Perceived Exertion**: Analyzes activity descriptions for RPE mentions

### 2. Oura Sleep Data

- **HRV Drop**: Monitors significant decreases in heart rate variability
- **Resting Heart Rate**: Tracks elevated resting heart rate patterns
- **Sleep Debt**: Calculates cumulative sleep deficit

## 🚀 Usage

### 1. Access the Recovery Page

Navigate to `/recovery` in your app to access the burnout calculator.

### 2. Configure Settings

1. **Enter Strava Access Token**: Paste your Strava access token
2. **Set Date Range**: Choose the period for analysis
3. **Adjust Weights**: Customize the importance of each factor (optional)

### 3. Calculate Burnout Risk

Click "Calculate Burnout Risk" to analyze your data and get weekly breakdowns.

## 🔧 API Endpoints

### Strava Endpoints

- `POST /api/strava/refresh-token` - Refresh expired access tokens
- `GET /api/strava/activities/recent` - Fetch recent activities
- `GET /api/strava/athlete/stats` - Get athlete statistics
- `GET /api/strava/activities/[id]` - Get specific activity details

### Burnout Calculation

- `POST /api/burnout/calculate` - Calculate burnout scores for a date range

## 📈 Understanding the Results

### Weekly Breakdown

Each week shows:

- **Total Score**: Overall burnout risk (0-1)
- **Risk Level**: Low/Moderate/High
- **Individual Scores**: Breakdown of each contributing factor

### Summary Statistics

- **Average Score**: Mean burnout risk across all weeks
- **Highest Score**: Peak risk period
- **Lowest Score**: Lowest risk period
- **Total Weeks**: Number of weeks analyzed

## 🔒 Security Considerations

1. **Access Tokens**: Never commit tokens to version control
2. **Token Refresh**: Implement automatic token refresh for production
3. **Rate Limiting**: Respect Strava's API rate limits
4. **Data Privacy**: Handle user data according to privacy regulations

## 🐛 Troubleshooting

### Common Issues

1. **"Missing Strava API credentials"**

   - Ensure environment variables are set correctly
   - Check that `.env.local` is in the project root

2. **"Strava API error: 401 Unauthorized"**

   - Access token may be expired
   - Use the refresh token endpoint to get a new token

3. **"No activities found"**

   - Check that the date range contains activities
   - Verify the access token has proper permissions

4. **"Missing Oura data"**
   - Ensure Oura API token is valid
   - Check that sleep data exists for the selected date range

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG=strava:*
```

## 📚 Additional Resources

- [Strava API Documentation](https://developers.strava.com/)
- [Oura API Documentation](https://cloud.ouraring.com/docs/)
- [ACWR Research](https://pubmed.ncbi.nlm.nih.gov/27127268/)
- [HRV and Recovery](https://www.frontiersin.org/articles/10.3389/fphys.2019.00645/full)

# Training Insights - Advanced Analytics

This document describes the three advanced training insights features that integrate Strava and Oura data to provide comprehensive training load and recovery analytics.

## Features Overview

### 1. Training Load-to-Recovery Alignment Score (Weekly)

Calculates weekly alignment between training load and recovery metrics to identify optimal training-recovery balance.

### 2. Strain-Recovery Mismatch Timeline (Weekly)

Detects weeks where training load significantly exceeds recovery capacity, providing severity assessment and recommendations.

### 3. Recovery Efficiency Index

Analyzes rest day recovery efficiency based on HRV improvement, sleep quality, and activity patterns.

## Data Requirements

### Strava Data

- **Daily Activity Data**: Date, duration, distance, RPE (estimated), activity type
- **Access Token**: Required for API authentication
- **Date Range**: Configurable start and end dates

### Oura Data

- **Readiness Metrics**: Daily readiness score, HRV (RMSSD), resting heart rate, sleep score, sleep duration
- **Sleep Data**: Average HRV, average heart rate, total sleep duration, sleep score
- **API Token**: Required for data access (environment variable: `OURA_API_TOKEN`)

## API Endpoints

### 1. Training Load-to-Recovery Alignment

**Endpoint**: `POST /api/training/alignment`

**Request Body**:

```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "access_token": "strava_access_token"
}
```

**Response**:

```json
{
  "weekly_scores": [
    {
      "week_start": "2024-01-01",
      "week_end": "2024-01-07",
      "training_load_score": 75.5,
      "recovery_score": 68.2,
      "alignment_score": 92.7,
      "activities": [...],
      "readiness_data": [...],
      "sleep_data": [...],
      "total_activities": 5,
      "total_duration": 420
    }
  ],
  "summary": {
    "average_alignment": 85.3,
    "best_alignment_week": "2024-01-01 to 2024-01-07",
    "worst_alignment_week": "2024-01-08 to 2024-01-14",
    "total_weeks": 52,
    "total_activities": 156,
    "total_duration": 12600
  }
}
```

### 2. Strain-Recovery Mismatch Detection

**Endpoint**: `POST /api/training/mismatch`

**Request Body**: Same as alignment endpoint

**Response**:

```json
{
  "weekly_mismatches": [
    {
      "week_start": "2024-01-08",
      "week_end": "2024-01-14",
      "training_load_score": 85.2,
      "recovery_score": 35.1,
      "mismatch_severity": "high",
      "activities": [...],
      "readiness_data": [...],
      "sleep_data": [...],
      "total_activities": 7,
      "total_duration": 540,
      "recommendations": [
        "Very high weekly training load - consider reducing intensity or volume",
        "Poor weekly recovery - prioritize rest and sleep"
      ]
    }
  ],
  "summary": {
    "total_mismatches": 8,
    "high_severity_count": 3,
    "moderate_severity_count": 4,
    "low_severity_count": 1,
    "most_common_issue": "sleep"
  }
}
```

### 3. Recovery Efficiency Index

**Endpoint**: `POST /api/training/recovery-efficiency`

**Request Body**: Same as alignment endpoint

**Response**:

```json
{
  "rest_days": [
    {
      "date": "2024-01-02",
      "hrv_today": 45.2,
      "hrv_yesterday": 38.1,
      "hrv_improvement": 7.1,
      "sleep_duration": 8.2,
      "sleep_score": 85,
      "activity_score": 15,
      "recovery_efficiency": 78.5,
      "is_verified_rest": true
    }
  ],
  "summary": {
    "total_rest_days": 45,
    "average_efficiency": 72.3,
    "best_rest_day": "2024-01-15",
    "worst_rest_day": "2024-01-22",
    "efficiency_trend": "improving"
  }
}
```

## Technical Implementation

### Score Calculation Logic

#### Training Load Score (Weekly)

1. **RPE Estimation**: Based on Strava suffer score or activity type

   - Suffer score < 20: RPE 3 (easy)
   - Suffer score 20-50: RPE 5 (moderate)
   - Suffer score 50-100: RPE 7 (hard)
   - Suffer score > 100: RPE 9 (very hard)

2. **Load Calculation**: `RPE × duration (minutes)`
3. **Weekly Normalization**: Normalized to 0-100 scale based on weekly volume
   - 100 = Very high weekly load (RPE 9 × 60 minutes × 7 days = 3780)

#### Recovery Score (Weekly)

Averages multiple factors over the week:

1. **HRV Score**: Normalized 20-100ms range
2. **Resting Heart Rate**: Lower is better (40-80bpm range)
3. **Sleep Score**: Direct Oura score
4. **Sleep Duration**: Optimal 7-9 hours
5. **Readiness Score**: Direct Oura score

#### Alignment Score

`100 - |training_load_score - recovery_score|`

#### Mismatch Detection

- **Condition**: `training_load_score > 70 AND recovery_score < 60`
- **Severity Levels**:
  - High: Gap > 50
  - Moderate: Gap > 30
  - Low: Gap ≤ 30

#### Recovery Efficiency

For verified rest days (low activity):

```
Efficiency = (HRV_improvement × 0.4) + (sleep_score × 0.3) + (sleep_duration_score × 0.3)
```

### Data Processing

#### Weekly Grouping

- Activities and recovery data grouped by calendar weeks
- Week boundaries: Monday to Sunday
- Partial weeks handled at start/end of date range

#### Data Validation

- Missing Oura data defaults to neutral scores
- Invalid Strava activities filtered out
- Date range validation and error handling

## Frontend Implementation

### Page Location

`/training/insights` - Accessible via Training section navigation

### UI Components

#### Configuration Section

- Date range picker (start/end dates)
- Strava access token input
- Calculate buttons for each metric

#### Results Display

- **Summary Cards**: Key metrics with color-coded scores
- **Detailed Lists**: Scrollable weekly breakdowns
- **Color Coding**:
  - Green: Good scores (≥80 alignment, ≥70 efficiency)
  - Yellow: Moderate scores (60-79 alignment, 50-69 efficiency)
  - Red: Poor scores (<60 alignment, <50 efficiency)

#### Data Visualization

- Weekly alignment trends
- Mismatch severity distribution
- Recovery efficiency timeline

### State Management

- Separate loading states for each calculation
- Error handling with user-friendly messages
- Data persistence during session

## Security Considerations

### API Security

- Strava access tokens handled securely
- Oura API token stored in environment variables
- Input validation and sanitization
- Rate limiting for API calls

### Data Privacy

- No personal data stored permanently
- API tokens not logged or cached
- Secure transmission of all data

## Error Handling

### API Errors

- Strava API failures: User-friendly error messages
- Oura API failures: Graceful degradation
- Network errors: Retry mechanisms
- Invalid data: Validation and filtering

### Frontend Errors

- Loading states for all operations
- Error boundaries for component failures
- User feedback for all error conditions

## Performance Optimization

### API Optimization

- Efficient data fetching with proper date ranges
- Caching of API responses where appropriate
- Batch processing of weekly calculations

### Frontend Optimization

- Virtual scrolling for large datasets
- Lazy loading of detailed data
- Efficient re-rendering with React optimization

## Future Enhancements

### Planned Features

1. **Trend Analysis**: Long-term pattern recognition
2. **Predictive Analytics**: Training load forecasting
3. **Custom Thresholds**: User-configurable alert levels
4. **Export Functionality**: Data export to CSV/PDF
5. **Mobile Optimization**: Responsive design improvements

### Integration Opportunities

1. **Calendar Integration**: Sync with training calendar
2. **Notification System**: Alert for mismatches
3. **Social Features**: Share insights with coaches
4. **Machine Learning**: Personalized recommendations

## Usage Instructions

### Getting Started

1. Navigate to Training section → Insights tab
2. Enter date range for analysis
3. Provide Strava access token
4. Click "Calculate" buttons for desired metrics

### Interpreting Results

1. **Alignment Score**: Higher is better (optimal training-recovery balance)
2. **Mismatch Detection**: Red flags for overtraining risk
3. **Recovery Efficiency**: Quality of rest day recovery

### Best Practices

1. Use 4-12 week date ranges for meaningful analysis
2. Ensure consistent Oura data availability
3. Review mismatches weekly for training adjustments
4. Monitor recovery efficiency trends over time

## Troubleshooting

### Common Issues

1. **No Data**: Check date range and API tokens
2. **Low Scores**: Verify Oura data quality
3. **API Errors**: Validate access tokens
4. **Slow Loading**: Reduce date range size

### Support

- Check browser console for detailed errors
- Verify API token permissions
- Ensure stable internet connection
- Contact support for persistent issues

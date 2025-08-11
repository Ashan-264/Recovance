# API Setup Guide

This application requires API tokens from Strava and Mapbox to display activity data and maps.

## Strava API Token

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application or use an existing one
3. Set the Authorization Callback Domain to `localhost` (for development)
4. Copy your **Access Token** from the API settings page
5. Paste the token in the "Strava Access Token" field in the dashboard

## Mapbox API Token

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Sign up or log in to your Mapbox account
3. Navigate to the [Access Tokens page](https://account.mapbox.com/access-tokens/)
4. Create a new token or use the default public token
5. Copy the token and paste it in the "Mapbox Access Token" field in the dashboard

## Features

### Activity Map

- Displays all your Strava activities on an interactive map
- Activities are clustered by location to avoid overcrowding
- Click on any cluster to see detailed activity information
- Shows activity count, total distance, and total time
- Dark theme map that matches the application design

### Activity Clustering

- Activities within ~1km radius are grouped together
- Cluster markers show the number of activities at each location
- Hover effects and smooth animations
- Detailed activity list when clicking on clusters

### Map Controls

- Navigation controls (zoom in/out, compass)
- Fullscreen mode
- Automatic map fitting to show all activities
- Responsive design that works on all screen sizes

## Security Notes

- API tokens are stored locally in the browser
- Tokens are not sent to any server except the respective API providers
- Use environment variables in production for better security

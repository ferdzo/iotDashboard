# IoT Dashboard Frontend

React-based dashboard for visualizing IoT telemetry data with customizable widgets.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite | Build tool and dev server |
| TypeScript | Type safety |
| DaisyUI | Component library |
| Tailwind CSS | Styling |
| React Query | Data fetching and caching |
| Recharts | Data visualization |
| React Grid Layout | Drag-and-drop widget layout |

## Features

- Customizable widget-based dashboard
- Drag-and-drop layout editing
- Multiple widget types (weather, charts, calendar, AI briefings)
- Responsive design
- Dark/light theme support

## Widget Types

| Widget | Description |
|--------|-------------|
| WeatherWidget | Current weather and forecast |
| AirQualityWidget | PM2.5, PM10 levels from pulse.eco |
| ComfortIndexWidget | Indoor comfort based on temperature/humidity |
| RunSuitabilityWidget | Outdoor running conditions analysis |
| CalendarWidget | iCal calendar integration |
| DailyBriefingWidget | AI-generated daily summary |
| HealthStatsWidget | Health metrics from wearables |
| TelemetryChartWidget | Time-series data visualization |

## Project Structure

```
frontend/
├── src/
│   ├── api/            # API client functions
│   ├── components/     # React components
│   │   ├── widgets/    # Widget components
│   │   └── ...
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── package.json        # Dependencies
└── vite.config.ts      # Vite configuration
```

## Running

```bash
cd frontend
npm install
npm run dev
```

Development server runs at http://localhost:5173

## Configuration

The frontend connects to the Django API. Configure the API URL in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

## Building for Production

```bash
npm run build
```

Output is in the `dist/` directory.

## Key Components

| Component | Purpose |
|-----------|---------|
| Dashboard.tsx | Main dashboard with widget grid |
| WidgetWrapper.tsx | Generic widget container |
| EditWidgetModal.tsx | Widget configuration modal |
| AddWidgetMenu.tsx | Widget type selection |

## API Integration

All API calls are in `src/api/index.ts`. Uses React Query for:
- Automatic caching
- Background refetching
- Loading/error states

Example:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['weather', city],
  queryFn: () => fetchWeather(city),
});
```

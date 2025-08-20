# Widget Configuration Guide

## Overview

The helpNINJA widget configuration system allows you to customize the appearance, behavior, and content of your chat widget for each site you manage. This guide covers the real-time preview feature and configuration options.

## Real-Time Widget Preview

As of August 2025, the widget configuration page includes a real-time preview feature that shows your changes instantly as you make them. This interactive preview shows:

- The chat bubble with your selected icon and color
- The expanded chat interface with your welcome message
- The AI assistant name and styling options
- Animation effects that simulate user interaction

### Key Benefits

- **Instant Feedback**: See changes to colors, positions, and text immediately
- **Interactive Testing**: Click the chat bubble to expand the chat interface
- **Realistic Preview**: Experience the same animations and styling that your users will see
- **Contextual Display**: Shows how the widget will appear on different parts of a webpage

## Configuration Categories

The widget configuration is organized into three main categories:

### 1. Appearance

- **Primary Color**: Select the main color for your chat bubble and header
- **Theme**: Choose between Light, Dark, or Auto (follows user preference)
- **Button Icon**: Select from Logo (default), Chat, Help, or Message icons
- **Widget Position**: Choose from Bottom Right, Bottom Left, Top Right, or Top Left

### 2. Behavior

- **Auto-Open Delay**: Set a delay (in milliseconds) after which the widget automatically opens
  - Set to 0 to disable auto-open functionality
- **Show Branding**: Toggle whether to show "Powered by helpNINJA" in the widget footer

### 3. Content

- **Welcome Message**: Customize the initial message shown when a user opens the chat
- **AI Assistant Name**: Set a custom name for your AI assistant
- **Voice Style**: Choose from Friendly, Professional, Casual, or Formal tones

## Using the Widget Configuration

1. Navigate to Dashboard → Widget Settings or Dashboard → Sites → [Select Site] → Configure
2. Make changes to any configuration option
3. Watch the real-time preview update instantly
4. Click the chat bubble in the preview to see the expanded chat interface
5. Click "Save Configuration" when you're satisfied with your changes

## Best Practices

- **Match Your Brand**: Use colors that complement your website's design
- **Clear Welcome Message**: Set expectations for what your assistant can help with
- **Strategic Positioning**: Consider your website layout when choosing a position
- **Test on Different Devices**: Ensure your widget looks good on mobile and desktop

## Technical Implementation

The real-time preview is implemented using React state management and CSS animations. Each time a configuration option is changed, the preview component immediately reflects that change without requiring a save or reload.

## Troubleshooting

If the real-time preview doesn't match what you see on your website:

1. Make sure you've saved your configuration
2. Clear your browser cache
3. Verify that your website is using the correct tenant ID and site ID
4. Check that you're viewing the same site as the one you've configured

For any issues, contact helpNINJA support for assistance.

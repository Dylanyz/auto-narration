tell application "System Events"
    tell application "System Settings" to activate
    delay 1
    
    -- Navigate to Keyboard > Keyboard Shortcuts > App Shortcuts
    -- This is complex in Ventura/Sonoma due to the new SwiftUI settings pane, 
    -- defaults write is still the industry standard for programmatic deployment even with the restart caveat. 
    -- Testing if we can just script the defaults write combined with a small dialog telling the user to restart Premiere
end tell

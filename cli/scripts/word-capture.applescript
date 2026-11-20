on run argv
  set captureOperation to item 1 of argv
  set sourcePath to item 2 of argv
  set sourceURL to item 3 of argv
  with timeout of 120 seconds
    if captureOperation is "open" then
      set sourceFile to (POSIX file sourcePath) as alias
      tell application id "com.microsoft.Word"
        repeat with existingDocument in (get documents)
          if posix full name of existingDocument is sourcePath then error "Close the input document in Word before capturing: " & sourcePath
        end repeat
        open sourceFile read only true add to recent files false
      end tell
      delay 2
    end if
    tell application "System Events"
      tell process "Microsoft Word"
        set frontmost to true
        set captureWindow to missing value
        repeat with candidate in windows
          if value of attribute "AXDocument" of candidate is sourceURL then set captureWindow to candidate
        end repeat
        if captureWindow is missing value then error "Word has no window for the input document"
        perform action "AXRaise" of captureWindow
        delay 0.5
        if value of attribute "AXDocument" of window 1 is not sourceURL then error "The active Word document changed; capture stopped"
        if captureOperation is "close" then
          keystroke "w" using command down
          delay 0.5
          return ""
        end if
        if captureOperation is "open" then
          set position of window 1 to {300, 40}
          set size of window 1 to {1200, 1000}
          click radio button "Print Layout" of radio group 1 of group 1 of window 1
          click radio button "View" of tab group 1 of window 1
          delay 0.5
          click button "One Page" of group 3 of scroll area 1 of tab group 1 of window 1
          set value of slider 1 of group 1 of window 1 to 500
          repeat 30 times
            delay 0.5
            repeat with statusButton in buttons of group 1 of window 1
              if name of statusButton starts with "Page " then return (name of statusButton) & linefeed & (name of window 1)
            end repeat
          end repeat
          error "Word did not finish paginating or its page-count status is hidden"
        end if
        set viewport to scroll area 1 of group 1 of splitter group 1 of splitter group 1 of splitter group 1 of window 1
        delay 1
        set viewportPosition to position of viewport
        set viewportSize to size of viewport
        set windowPosition to position of window 1
        set windowSize to size of window 1
        set region to (value of scroll bar 1 of viewport as text) & "," & ((item 1 of viewportPosition) - (item 1 of windowPosition))
        set region to region & "," & ((item 2 of viewportPosition) - (item 2 of windowPosition)) & "," & (item 1 of viewportSize) & "," & (item 2 of viewportSize) & "," & (item 1 of windowSize)
      end tell
    end tell
    do shell script "/usr/sbin/screencapture -x -o -l" & quoted form of (item 6 of argv) & " " & quoted form of (item 5 of argv)
    return region
  end timeout
end run

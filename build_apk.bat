set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\DELL\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd android
call gradlew.bat clean assembleDebug --stacktrace

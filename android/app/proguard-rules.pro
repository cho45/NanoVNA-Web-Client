# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep public class org.apache.cordova.CordovaPlugin
-keep public class com.getcapacitor.plugin.App {
    static *;
    public *;
}
-keep public class com.getcapacitor.plugin.Device {
    static *;
    public *;
}
-keep public class com.getcapacitor.plugin.Filesystem {
    static *;
    public *;
}

-keep public class fr.drangies.cordova.serial.**
-keepclasseswithmembers class com.hoho.android.usbserial.driver.** {
    static *;
    public *;
}

-printconfiguration /tmp/full-r8-config.txt
-printusage /tmp/usage.txt
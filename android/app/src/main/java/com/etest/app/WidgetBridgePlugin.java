package com.etest.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data == null) {
                call.reject("No data provided");
                return;
            }

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(TodayTasksWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(TodayTasksWidgetProvider.KEY_WIDGET_DATA, data.toString()).apply();

            // Trigger widget update immediately
            TodayTasksWidgetProvider.updateAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject("Failed to update widget: " + t.getMessage());
        }
    }

    @PluginMethod
    public void reloadWidget(PluginCall call) {
        try {
            TodayTasksWidgetProvider.updateAllWidgets(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject("Failed to reload widget: " + t.getMessage());
        }
    }
}
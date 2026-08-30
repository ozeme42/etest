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
            SharedPreferences prefs = context.getSharedPreferences("ETestWidgetPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            // 1. Books Data
            if (data.has("booksData")) {
                JSObject booksObj = data.getJSObject("booksData");
                if (booksObj != null) {
                    editor.putString(BooksWidgetProvider.KEY_BOOKS_DATA, booksObj.toString());
                }
            }

            // 2. Program Data
            if (data.has("programData")) {
                JSObject progObj = data.getJSObject("programData");
                if (progObj != null) {
                    editor.putString(ProgramWidgetProvider.KEY_PROGRAM_DATA, progObj.toString());
                }
            }

            // 3. CatchUp Data
            if (data.has("catchUpData")) {
                JSObject cuObj = data.getJSObject("catchUpData");
                if (cuObj != null) {
                    editor.putString(CatchUpWidgetProvider.KEY_CATCHUP_DATA, cuObj.toString());
                }
            }

            // Fallback for combined today tasks widget
            editor.putString(TodayTasksWidgetProvider.KEY_WIDGET_DATA, data.toString());
            editor.apply();

            // Refresh all 3 widgets on home screen
            BooksWidgetProvider.updateAllWidgets(context);
            ProgramWidgetProvider.updateAllWidgets(context);
            CatchUpWidgetProvider.updateAllWidgets(context);
            TodayTasksWidgetProvider.updateAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject("Failed to update widgets: " + t.getMessage());
        }
    }

    @PluginMethod
    public void reloadWidget(PluginCall call) {
        try {
            Context context = getContext();
            BooksWidgetProvider.updateAllWidgets(context);
            ProgramWidgetProvider.updateAllWidgets(context);
            CatchUpWidgetProvider.updateAllWidgets(context);
            TodayTasksWidgetProvider.updateAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Throwable t) {
            call.reject("Failed to reload widgets: " + t.getMessage());
        }
    }
}
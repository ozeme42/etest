package com.etest.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class CatchUpWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "ETestWidgetPrefs";
    public static final String KEY_CATCHUP_DATA = "widget_catchup_json";
    public static final String EXTRA_TARGET_URL = "target_url";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName provider = new ComponentName(context, CatchUpWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(provider);
            if (ids != null && ids.length > 0) {
                for (int id : ids) {
                    updateAppWidget(context, manager, id);
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_catchup);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_CATCHUP_DATA, null);

            String studentName = "Öğrenci Paneli";
            int totalCatchUp = 0;
            JSONArray catchUpArray = null;

            if (rawJson != null && !rawJson.trim().isEmpty()) {
                JSONObject data = new JSONObject(rawJson);
                if (data.has("studentName")) studentName = data.optString("studentName", "Öğrenci Paneli");
                totalCatchUp = data.optInt("totalCatchUp", 0);
                catchUpArray = data.optJSONArray("catchUpTasks");
            }

            views.setTextViewText(R.id.widget_student_name, "👤 " + studentName);
            views.setTextViewText(R.id.widget_status_badge, totalCatchUp + " Telafi");

            // Header & Action Intent
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainIntent.putExtra(EXTRA_TARGET_URL, "/student");
            PendingIntent mainPendingIntent = PendingIntent.getActivity(
                context, 30, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_header, mainPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_action_btn, mainPendingIntent);

            int[] catchUpItemIds = { R.id.widget_catchup_item_1, R.id.widget_catchup_item_2, R.id.widget_catchup_item_3, R.id.widget_catchup_item_4 };
            int[] catchUpTitleIds = { R.id.widget_catchup_title_1, R.id.widget_catchup_title_2, R.id.widget_catchup_title_3, R.id.widget_catchup_title_4 };
            int[] catchUpSubIds = { R.id.widget_catchup_sub_1, R.id.widget_catchup_sub_2, R.id.widget_catchup_sub_3, R.id.widget_catchup_sub_4 };

            int catchUpCount = catchUpArray != null ? catchUpArray.length() : 0;
            if (catchUpCount == 0) {
                views.setViewVisibility(R.id.widget_empty_catchup, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty_catchup, View.GONE);
            }

            for (int i = 0; i < 4; i++) {
                if (i < catchUpCount) {
                    JSONObject task = catchUpArray.getJSONObject(i);
                    String title = task.optString("title", "Telafi Testi");
                    String sourceDay = task.optString("sourceDay", "");
                    String bookTitle = task.optString("bookTitle", "");
                    String subInfo = (sourceDay.isEmpty() ? "" : sourceDay + " • ") + (bookTitle.isEmpty() ? "Telafi Görevi" : bookTitle);
                    String targetUrl = task.optString("url", "/student");

                    views.setViewVisibility(catchUpItemIds[i], View.VISIBLE);
                    views.setTextViewText(catchUpTitleIds[i], title);
                    views.setTextViewText(catchUpSubIds[i], subInfo);

                    Intent taskIntent = new Intent(context, MainActivity.class);
                    taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    taskIntent.putExtra(EXTRA_TARGET_URL, targetUrl);
                    taskIntent.setData(Uri.parse("etest://catchup/" + i + "/" + System.currentTimeMillis()));
                    PendingIntent taskPendingIntent = PendingIntent.getActivity(
                        context, 300 + i, taskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(catchUpItemIds[i], taskPendingIntent);
                } else {
                    views.setViewVisibility(catchUpItemIds[i], View.GONE);
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
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

public class ProgramWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "ETestWidgetPrefs";
    public static final String KEY_PROGRAM_DATA = "widget_program_json";
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
            ComponentName provider = new ComponentName(context, ProgramWidgetProvider.class);
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_program);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_PROGRAM_DATA, null);

            String studentName = "Öğrenci Paneli";
            int totalTasks = 0;
            int remainingTasks = 0;
            JSONArray tasksArray = null;

            if (rawJson != null && !rawJson.trim().isEmpty()) {
                JSONObject data = new JSONObject(rawJson);
                if (data.has("studentName")) studentName = data.optString("studentName", "Öğrenci Paneli");
                totalTasks = data.optInt("todayTotalCount", 0);
                remainingTasks = data.optInt("todayRemainingCount", 0);
                tasksArray = data.optJSONArray("todayTasks");
            }

            views.setTextViewText(R.id.widget_student_name, "👤 " + studentName);
            if (totalTasks == 0) {
                views.setTextViewText(R.id.widget_status_badge, "0 Görev");
            } else if (remainingTasks == 0) {
                views.setTextViewText(R.id.widget_status_badge, "Tamamlandı 🎉");
            } else {
                views.setTextViewText(R.id.widget_status_badge, remainingTasks + " Görev Kaldı");
            }

            // Header & Action Intent
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainIntent.putExtra(EXTRA_TARGET_URL, "/my-program");
            PendingIntent mainPendingIntent = PendingIntent.getActivity(
                context, 20, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_header, mainPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_action_btn, mainPendingIntent);

            int[] taskItemIds = { R.id.widget_task_item_1, R.id.widget_task_item_2, R.id.widget_task_item_3, R.id.widget_task_item_4 };
            int[] taskTitleIds = { R.id.widget_task_title_1, R.id.widget_task_title_2, R.id.widget_task_title_3, R.id.widget_task_title_4 };
            int[] taskSubIds = { R.id.widget_task_sub_1, R.id.widget_task_sub_2, R.id.widget_task_sub_3, R.id.widget_task_sub_4 };
            int[] taskStatusIds = { R.id.widget_task_status_1, R.id.widget_task_status_2, R.id.widget_task_status_3, R.id.widget_task_status_4 };

            int taskCount = tasksArray != null ? tasksArray.length() : 0;
            if (taskCount == 0 && totalTasks > 0) {
                views.setViewVisibility(R.id.widget_empty_tasks, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_tasks, "🎉 Bugün için tüm görevler tamamlandı!");
            } else if (taskCount == 0) {
                views.setViewVisibility(R.id.widget_empty_tasks, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_tasks, "Bugün için planlanmış test bulunmuyor.");
            } else {
                views.setViewVisibility(R.id.widget_empty_tasks, View.GONE);
            }

            for (int i = 0; i < 4; i++) {
                if (i < taskCount) {
                    JSONObject task = tasksArray.getJSONObject(i);
                    String title = task.optString("title", "Test");
                    String subject = task.optString("subject", "");
                    String page = task.optString("page", "");
                    String subInfo = subject + (page.isEmpty() ? "" : " • " + page);
                    boolean isDone = task.optBoolean("isDone", false);
                    String targetUrl = task.optString("url", "/student");

                    views.setViewVisibility(taskItemIds[i], View.VISIBLE);
                    views.setTextViewText(taskTitleIds[i], title);
                    views.setTextViewText(taskSubIds[i], subInfo.isEmpty() ? "Kitap Testi" : subInfo);
                    views.setTextViewText(taskStatusIds[i], isDone ? "✅" : "⏳");

                    Intent taskIntent = new Intent(context, MainActivity.class);
                    taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    taskIntent.putExtra(EXTRA_TARGET_URL, targetUrl);
                    taskIntent.setData(Uri.parse("etest://program/" + i + "/" + System.currentTimeMillis()));
                    PendingIntent taskPendingIntent = PendingIntent.getActivity(
                        context, 200 + i, taskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(taskItemIds[i], taskPendingIntent);
                } else {
                    views.setViewVisibility(taskItemIds[i], View.GONE);
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
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
    public static final String KEY_SELECTED_DAY_INDEX = "widget_selected_day_index";
    public static final String EXTRA_TARGET_URL = "target_url";

    public static final String ACTION_PREV_DAY = "com.etest.app.ACTION_PROGRAM_PREV_DAY";
    public static final String ACTION_NEXT_DAY = "com.etest.app.ACTION_PROGRAM_NEXT_DAY";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PREV_DAY.equals(action) || ACTION_NEXT_DAY.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int currentIndex = prefs.getInt(KEY_SELECTED_DAY_INDEX, 0);
            int totalDays = 7;

            String rawJson = prefs.getString(KEY_PROGRAM_DATA, null);
            if (rawJson != null) {
                try {
                    JSONObject data = new JSONObject(rawJson);
                    JSONArray days = data.optJSONArray("days");
                    if (days != null && days.length() > 0) {
                        totalDays = days.length();
                    }
                } catch (Throwable ignored) {}
            }

            if (ACTION_PREV_DAY.equals(action)) {
                currentIndex = (currentIndex - 1 + totalDays) % totalDays;
            } else {
                currentIndex = (currentIndex + 1) % totalDays;
            }

            prefs.edit().putInt(KEY_SELECTED_DAY_INDEX, currentIndex).apply();
            updateAllWidgets(context);
        }
    }

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
            int selectedDayIndex = prefs.getInt(KEY_SELECTED_DAY_INDEX, 0);

            String studentName = "Öğrenci Paneli";
            String dayLabel = "📅 Bugünün Programı";
            int totalTasks = 0;
            int remainingTasks = 0;
            JSONArray tasksArray = null;

            if (rawJson != null && !rawJson.trim().isEmpty()) {
                JSONObject data = new JSONObject(rawJson);
                if (data.has("studentName")) studentName = data.optString("studentName", "Öğrenci Paneli");

                JSONArray daysArray = data.optJSONArray("days");
                if (daysArray != null && daysArray.length() > 0) {
                    selectedDayIndex = Math.max(0, Math.min(selectedDayIndex, daysArray.length() - 1));
                    JSONObject currentDay = daysArray.getJSONObject(selectedDayIndex);
                    String dayName = currentDay.optString("dayName", "Gün");
                    String dateLabel = currentDay.optString("dateLabel", "");
                    boolean isToday = currentDay.optBoolean("isToday", false);

                    dayLabel = "📅 " + (isToday ? "Bugün (" + dayName + ")" : dayName) + (dateLabel.isEmpty() ? "" : " • " + dateLabel);
                    totalTasks = currentDay.optInt("totalCount", 0);
                    remainingTasks = currentDay.optInt("remainingCount", 0);
                    tasksArray = currentDay.optJSONArray("items");
                } else {
                    totalTasks = data.optInt("todayTotalCount", 0);
                    remainingTasks = data.optInt("todayRemainingCount", 0);
                    tasksArray = data.optJSONArray("todayTasks");
                }
            }

            views.setTextViewText(R.id.widget_student_name, "👤 " + studentName);
            views.setTextViewText(R.id.widget_day_label, dayLabel);

            if (totalTasks == 0) {
                views.setTextViewText(R.id.widget_status_badge, "0 Görev");
            } else if (remainingTasks == 0) {
                views.setTextViewText(R.id.widget_status_badge, "Tamamlandı 🎉");
            } else {
                views.setTextViewText(R.id.widget_status_badge, remainingTasks + " Görev Kaldı");
            }

            // Day Switcher Intents
            Intent prevDayIntent = new Intent(context, ProgramWidgetProvider.class);
            prevDayIntent.setAction(ACTION_PREV_DAY);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(
                context, 501, prevDayIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_prev_day, prevPendingIntent);

            Intent nextDayIntent = new Intent(context, ProgramWidgetProvider.class);
            nextDayIntent.setAction(ACTION_NEXT_DAY);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
                context, 502, nextDayIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_next_day, nextPendingIntent);

            // Bottom Action Intent -> Go to weekly program
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainIntent.putExtra(EXTRA_TARGET_URL, "/my-program");
            PendingIntent mainPendingIntent = PendingIntent.getActivity(
                context, 503, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_action_btn, mainPendingIntent);

            int[] taskItemIds = { R.id.widget_task_item_1, R.id.widget_task_item_2, R.id.widget_task_item_3, R.id.widget_task_item_4 };
            int[] taskTitleIds = { R.id.widget_task_title_1, R.id.widget_task_title_2, R.id.widget_task_title_3, R.id.widget_task_title_4 };
            int[] taskSubIds = { R.id.widget_task_sub_1, R.id.widget_task_sub_2, R.id.widget_task_sub_3, R.id.widget_task_sub_4 };
            int[] taskStatusIds = { R.id.widget_task_status_1, R.id.widget_task_status_2, R.id.widget_task_status_3, R.id.widget_task_status_4 };
            int[] taskSolveIds = { R.id.widget_task_solve_1, R.id.widget_task_solve_2, R.id.widget_task_solve_3, R.id.widget_task_solve_4 };

            int taskCount = tasksArray != null ? tasksArray.length() : 0;
            if (taskCount == 0 && totalTasks > 0) {
                views.setViewVisibility(R.id.widget_empty_tasks, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_tasks, "🎉 Bu günün tüm görevleri tamamlandı!");
            } else if (taskCount == 0) {
                views.setViewVisibility(R.id.widget_empty_tasks, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_tasks, "Bu gün için planlanmış test bulunmuyor.");
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

                    // Direct "⚡ Çöz" Intent -> Immediately launches quiz runner
                    Intent solveIntent = new Intent(context, MainActivity.class);
                    solveIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    solveIntent.putExtra(EXTRA_TARGET_URL, targetUrl);
                    solveIntent.setData(Uri.parse("etest://program/solve/" + i + "/" + System.currentTimeMillis()));
                    PendingIntent solvePendingIntent = PendingIntent.getActivity(
                        context, 600 + i, solveIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(taskSolveIds[i], solvePendingIntent);
                    views.setOnClickPendingIntent(taskItemIds[i], solvePendingIntent);
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
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

public class BooksWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "ETestWidgetPrefs";
    public static final String KEY_BOOKS_DATA = "widget_books_json";
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
            ComponentName provider = new ComponentName(context, BooksWidgetProvider.class);
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_books);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String rawJson = prefs.getString(KEY_BOOKS_DATA, null);

            String studentName = "Öğrenci Paneli";
            int totalBooks = 0;
            JSONArray booksArray = null;

            if (rawJson != null && !rawJson.trim().isEmpty()) {
                JSONObject data = new JSONObject(rawJson);
                if (data.has("studentName")) studentName = data.optString("studentName", "Öğrenci Paneli");
                totalBooks = data.optInt("totalBooks", 0);
                booksArray = data.optJSONArray("books");
            }

            views.setTextViewText(R.id.widget_student_name, "👤 " + studentName);
            views.setTextViewText(R.id.widget_status_badge, totalBooks + " Kitap");

            // Header & Action Btn Intent to Books page
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainIntent.putExtra(EXTRA_TARGET_URL, "/student/books");
            PendingIntent mainPendingIntent = PendingIntent.getActivity(
                context, 10, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_header, mainPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_action_btn, mainPendingIntent);

            int[] bookItemIds = { R.id.widget_book_item_1, R.id.widget_book_item_2, R.id.widget_book_item_3, R.id.widget_book_item_4 };
            int[] bookTitleIds = { R.id.widget_book_title_1, R.id.widget_book_title_2, R.id.widget_book_title_3, R.id.widget_book_title_4 };
            int[] bookProgressIds = { R.id.widget_book_progress_1, R.id.widget_book_progress_2, R.id.widget_book_progress_3, R.id.widget_book_progress_4 };

            int bookCount = booksArray != null ? booksArray.length() : 0;
            if (bookCount == 0) {
                views.setViewVisibility(R.id.widget_empty_books, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty_books, View.GONE);
            }

            for (int i = 0; i < 4; i++) {
                if (i < bookCount) {
                    JSONObject book = booksArray.getJSONObject(i);
                    String title = book.optString("title", "Kitap");
                    int solved = book.optInt("solvedTests", 0);
                    int total = book.optInt("totalTests", 0);
                    int pct = book.optInt("percent", 0);
                    String progressText = "🟢 " + solved + "/" + total + " (%" + pct + ")";
                    String targetUrl = book.optString("url", "/student/books");

                    views.setViewVisibility(bookItemIds[i], View.VISIBLE);
                    views.setTextViewText(bookTitleIds[i], title);
                    views.setTextViewText(bookProgressIds[i], progressText);

                    Intent bookIntent = new Intent(context, MainActivity.class);
                    bookIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    bookIntent.putExtra(EXTRA_TARGET_URL, targetUrl);
                    bookIntent.setData(Uri.parse("etest://books/" + i + "/" + System.currentTimeMillis()));
                    PendingIntent bookPendingIntent = PendingIntent.getActivity(
                        context, 100 + i, bookIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(bookItemIds[i], bookPendingIntent);
                } else {
                    views.setViewVisibility(bookItemIds[i], View.GONE);
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
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
    public static final String KEY_SELECTED_BOOK_INDEX = "widget_selected_book_index";
    public static final String EXTRA_TARGET_URL = "target_url";

    public static final String ACTION_PREV_BOOK = "com.etest.app.ACTION_BOOK_PREV";
    public static final String ACTION_NEXT_BOOK = "com.etest.app.ACTION_BOOK_NEXT";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PREV_BOOK.equals(action) || ACTION_NEXT_BOOK.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int currentIndex = prefs.getInt(KEY_SELECTED_BOOK_INDEX, 0);
            int totalBooks = 1;

            String rawJson = prefs.getString(KEY_BOOKS_DATA, null);
            if (rawJson != null) {
                try {
                    JSONObject data = new JSONObject(rawJson);
                    JSONArray books = data.optJSONArray("books");
                    if (books != null && books.length() > 0) {
                        totalBooks = books.length();
                    }
                } catch (Throwable ignored) {}
            }

            if (ACTION_PREV_BOOK.equals(action)) {
                currentIndex = (currentIndex - 1 + totalBooks) % totalBooks;
            } else {
                currentIndex = (currentIndex + 1) % totalBooks;
            }

            prefs.edit().putInt(KEY_SELECTED_BOOK_INDEX, currentIndex).apply();
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
            int selectedIndex = prefs.getInt(KEY_SELECTED_BOOK_INDEX, 0);

            String studentName = "Öğrenci Paneli";
            int totalBooks = 0;
            JSONArray booksArray = null;

            if (rawJson != null && !rawJson.trim().isEmpty()) {
                JSONObject data = new JSONObject(rawJson);
                if (data.has("studentName")) studentName = data.optString("studentName", "Öğrenci Paneli");
                booksArray = data.optJSONArray("books");
                totalBooks = booksArray != null ? booksArray.length() : data.optInt("totalBooks", 0);
            }

            views.setTextViewText(R.id.widget_student_name, "👤 " + studentName);

            if (booksArray == null || booksArray.length() == 0) {
                views.setTextViewText(R.id.widget_status_badge, "0 Kitap");
                views.setViewVisibility(R.id.widget_empty_books, View.VISIBLE);
                views.setViewVisibility(R.id.widget_book_card, View.GONE);
                appWidgetManager.updateAppWidget(appWidgetId, views);
                return;
            }

            views.setViewVisibility(R.id.widget_empty_books, View.GONE);
            views.setViewVisibility(R.id.widget_book_card, View.VISIBLE);

            selectedIndex = Math.max(0, Math.min(selectedIndex, booksArray.length() - 1));
            JSONObject currentBook = booksArray.getJSONObject(selectedIndex);

            String bookId = currentBook.optString("id", "");
            String title = currentBook.optString("title", "Kitap");
            String publisher = currentBook.optString("publisher", "Özel / MEB Yayınları");
            int solvedTests = currentBook.optInt("solvedTests", 0);
            int totalTests = currentBook.optInt("totalTests", 0);
            int percent = currentBook.optInt("percent", 0);
            int correct = currentBook.optInt("totalCorrect", 0);
            int wrong = currentBook.optInt("totalWrong", 0);
            int blank = currentBook.optInt("totalBlank", 0);
            double net = currentBook.optDouble("net", 0.0);
            int successRate = currentBook.optInt("successRate", 0);
            String subjectsBreakdown = currentBook.optString("subjectsBreakdown", "");

            // 1. Header info
            views.setTextViewText(R.id.widget_status_badge, (selectedIndex + 1) + "/" + totalBooks + " Kitap");
            views.setTextViewText(R.id.widget_book_header_title, "📘 " + title);

            // 2. Card header: Publisher & Success Rate
            views.setTextViewText(R.id.widget_book_publisher, "🏷️ " + (publisher.isEmpty() ? "Kitap Takibi" : publisher));
            views.setTextViewText(R.id.widget_book_success_rate, "🎯 %" + successRate + " Başarı");

            // 3. Progress text
            views.setTextViewText(R.id.widget_book_progress_pct, "📊 " + solvedTests + " / " + totalTests + " Test Çözüldü (%" + percent + " İlerleme)");

            // 4. Correct / Wrong / Blank / Net Stats
            views.setTextViewText(R.id.widget_stat_correct, "✓ " + correct + " D");
            views.setTextViewText(R.id.widget_stat_wrong, "✗ " + wrong + " Y");
            views.setTextViewText(R.id.widget_stat_blank, "○ " + blank + " B");
            String netStr = String.format(java.util.Locale.US, "%.1f", net);
            if (netStr.endsWith(".0")) netStr = netStr.substring(0, netStr.length() - 2);
            views.setTextViewText(R.id.widget_stat_net, "⚡ " + netStr + " Net");

            // 5. Subject breakdown
            views.setTextViewText(R.id.widget_book_subjects_breakdown, subjectsBreakdown.isEmpty() ? "Dersler ve Üniteler" : subjectsBreakdown);

            // 6. Book Switcher Intents
            Intent prevBookIntent = new Intent(context, BooksWidgetProvider.class);
            prevBookIntent.setAction(ACTION_PREV_BOOK);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(
                context, 801, prevBookIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_prev_book, prevPendingIntent);

            Intent nextBookIntent = new Intent(context, BooksWidgetProvider.class);
            nextBookIntent.setAction(ACTION_NEXT_BOOK);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
                context, 802, nextBookIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_next_book, nextPendingIntent);

            // 7. Action Button & Card Intent -> Go to Book Details & Test Map
            Intent bookDetailIntent = new Intent(context, MainActivity.class);
            bookDetailIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            bookDetailIntent.putExtra(EXTRA_TARGET_URL, "/student-book-details/" + bookId);
            bookDetailIntent.setData(Uri.parse("etest://book/detail/" + bookId + "/" + System.currentTimeMillis()));
            PendingIntent bookDetailPendingIntent = PendingIntent.getActivity(
                context, 803, bookDetailIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_action_btn, bookDetailPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_book_card, bookDetailPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
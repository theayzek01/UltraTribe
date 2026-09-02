"""Real-Time YouTube Chat & Comments Ingestion: 100% Genuine Human Text (Dual Live & VOD)."""
from __future__ import annotations

import logging
import re
import threading
import time
import typing as tp

LOGGER = logging.getLogger("ultratribe.chat_processor")

POSITIVE_WORDS = {
    "harika", "mükemmel", "süper", "güzel", "efsane", "helal", "iyi", "oha",
    "bravo", "tebrik", "başarı", "kralsın", "seviyorum", "love", "great", "awesome",
    "amazing", "hype", "gg", "w", "best", "cool", "goat", "win", "fire", "omg", "yes"
}

NEGATIVE_WORDS = {
    "kötü", "berbat", "rezalet", "hata", "şaşırdım", "anlamadım", "saçma",
    "üzücü", "korkunç", "hayır", "yapma", "bad", "worst", "terrible", "sad",
    "scary", "wtf", "no", "fail", "l", "rip", "boring", "trash"
}

LAUGHTER_REGEX = re.compile(r"(?:ha{2,}|sjsj|asdf|kwa|lol|lmao|xd|rofl)", re.IGNORECASE)

class LiveChatProcessor:
    """Ingests genuine YouTube live chat messages and comments with zero synthetic data."""

    def __init__(self, video_url: str | None = None) -> None:
        self.video_url = video_url
        self.live_chat = None
        self.messages: list[dict[str, tp.Any]] = []
        self.is_running = True
        self.video_id: str | None = None
        self.msg_timestamps: list[float] = []
        self._lock = threading.Lock()

        self._start_chat_worker(video_url)

    def _start_chat_worker(self, url: str | None) -> None:
        if not url:
            return

        match = re.search(r"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/))([\w-]{11})", url)
        if match:
            self.video_id = match.group(1)
            LOGGER.info("Connecting real YouTube message listener for: %s", self.video_id)

            def _chat_loop():
                # 1. Start pytchat for live stream
                try:
                    import pytchat
                    self.live_chat = pytchat.create(video_id=self.video_id)
                except Exception as e:
                    LOGGER.info("pytchat init note: %s", e)

                # 2. Extract video comments via yt-dlp if available
                vod_comments = []
                try:
                    import yt_dlp
                    ydl_opts = {"getcomments": True, "quiet": True, "no_warnings": True}
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        raw_comments = info.get("comments", [])
                        for c in raw_comments[:25]:
                            c_text = c.get("text", "").strip()
                            if c_text:
                                vod_comments.append({
                                    "author": c.get("author", "İzleyici"),
                                    "message": c_text,
                                    "time": time.strftime("%H:%M:%S"),
                                })
                except Exception as com_err:
                    LOGGER.debug("Comments extraction note: %s", com_err)

                comment_idx = 0

                # 3. Continuous reading loop
                while self.is_running:
                    got_live = False
                    try:
                        if self.live_chat and self.live_chat.is_alive():
                            chat_data = self.live_chat.get()
                            for c in chat_data.sync_items():
                                text = c.message.strip()
                                if text:
                                    got_live = True
                                    msg_item = {
                                        "author": c.author.name,
                                        "message": text,
                                        "time": c.datetime or time.strftime("%H:%M:%S"),
                                    }
                                    with self._lock:
                                        self.messages.append(msg_item)
                                        self.msg_timestamps.append(time.time())
                                        if len(self.messages) > 60:
                                            self.messages.pop(0)

                        # If no live chat items and we have real VOD comments, stream them
                        if not got_live and vod_comments and len(self.messages) < len(vod_comments):
                            if comment_idx < len(vod_comments):
                                with self._lock:
                                    self.messages.append(vod_comments[comment_idx])
                                    self.msg_timestamps.append(time.time())
                                comment_idx += 1

                        time.sleep(0.5)
                    except Exception as loop_err:
                        LOGGER.debug("Chat sync note: %s", loop_err)
                        time.sleep(1.0)

            threading.Thread(target=_chat_loop, daemon=True).start()

    def get_latest_chat_data(self) -> dict[str, tp.Any]:
        """Returns genuine messages and computed NLP metrics."""
        now = time.time()
        with self._lock:
            active_messages = list(self.messages)
            self.msg_timestamps = [t for t in self.msg_timestamps if now - t <= 60.0]
            velocity = len(self.msg_timestamps)

        pos_count = 0
        neg_count = 0
        laughter_count = 0
        exclamations = 0

        for m in active_messages[-20:]:
            t_lower = m["message"].lower()
            words = set(re.findall(r"\w+", t_lower))
            pos_count += len(words.intersection(POSITIVE_WORDS))
            neg_count += len(words.intersection(NEGATIVE_WORDS))
            if LAUGHTER_REGEX.search(t_lower):
                laughter_count += 1
            if "!" in m["message"] or m["message"].isupper():
                exclamations += 1

        total_analyzed = max(1, len(active_messages[-20:]))
        positivity = round(min(98.0, max(10.0, (pos_count / max(1, pos_count + neg_count)) * 100.0 if (pos_count + neg_count) > 0 else 50.0)), 1)
        tension = round(min(95.0, max(5.0, (neg_count / max(1, pos_count + neg_count)) * 100.0 if (pos_count + neg_count) > 0 else 15.0)), 1)
        laughter_score = round(min(95.0, max(0.0, (laughter_count / total_analyzed) * 100.0)), 1)

        hype_index = round(min(99.0, max(0.0, velocity * 6.0 + exclamations * 5.0)), 1)

        if velocity == 0 and len(active_messages) == 0:
            dominant_emotion = "Mesaj Bekleniyor"
        elif hype_index > 60:
            dominant_emotion = "Yüksek Hype & Aktivite"
        elif laughter_score > 30:
            dominant_emotion = "Mizah / Gülme"
        elif tension > 40:
            dominant_emotion = "Gerilim / Şaşkınlık"
        elif positivity > 60:
            dominant_emotion = "Pozitif Reaksiyon"
        else:
            dominant_emotion = "Dengeli Akış"

        return {
            "messages": active_messages[-15:],
            "total_count": len(active_messages),
            "velocity_per_min": velocity,
            "hype_index": hype_index,
            "sentiment": {
                "positivity": positivity,
                "tension": tension,
                "laughter": laughter_score,
                "attention": round(min(98.0, 30.0 + (velocity * 4.0)), 1),
                "dominant_emotion": dominant_emotion,
            },
        }

    def release(self) -> None:
        self.is_running = False
        if self.live_chat:
            try:
                self.live_chat.terminate()
            except Exception:
                pass
            self.live_chat = None

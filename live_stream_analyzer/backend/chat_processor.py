"""Real-Time Live YouTube Chat Processor: 100% Genuine Messages Only (Zero Synthetic Data)."""
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
    """Ingests strictly genuine live YouTube chat messages without any synthetic injection."""

    def __init__(self, video_url: str | None = None) -> None:
        self.video_url = video_url
        self.live_chat = None
        self.messages: list[dict[str, tp.Any]] = []
        self.is_connected = False
        self.video_id: str | None = None
        self.msg_timestamps: list[float] = []

        self._connect_live_chat(video_url)

    def _connect_live_chat(self, url: str | None) -> None:
        if not url:
            return

        match = re.search(r"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([\w-]{11})", url)
        if match:
            self.video_id = match.group(1)
            LOGGER.info("Starting pytchat listener for Video ID: %s", self.video_id)

            def _listener():
                try:
                    import pytchat
                    self.live_chat = pytchat.create(video_id=self.video_id)
                    self.is_connected = True
                    LOGGER.info("pytchat active on live chat for: %s", self.video_id)
                except Exception as e:
                    LOGGER.warning("pytchat connection note: %s", e)

            threading.Thread(target=_listener, daemon=True).start()

    def get_latest_chat_data(self) -> dict[str, tp.Any]:
        """Reads ONLY real messages arriving from YouTube live chat."""
        now = time.time()

        # Extract only real incoming chat items
        if self.live_chat and self.live_chat.is_alive():
            try:
                chat_data = self.live_chat.get()
                for c in chat_data.sync_items():
                    msg_text = c.message.strip()
                    if msg_text:
                        msg_obj = {
                            "author": c.author.name,
                            "message": msg_text,
                            "time": c.datetime or time.strftime("%H:%M:%S"),
                        }
                        self.messages.append(msg_obj)
                        self.msg_timestamps.append(now)
            except Exception as ex:
                LOGGER.debug("Live chat sync error: %s", ex)

        # Keep last 50 genuine messages
        if len(self.messages) > 50:
            self.messages = self.messages[-50:]

        # Real message frequency in last 60 seconds (msg/min)
        self.msg_timestamps = [t for t in self.msg_timestamps if now - t <= 60.0]
        velocity = len(self.msg_timestamps)

        pos_count = 0
        neg_count = 0
        laughter_count = 0
        exclamations = 0

        for m in self.messages[-20:]:
            t_lower = m["message"].lower()
            words = set(re.findall(r"\w+", t_lower))
            pos_count += len(words.intersection(POSITIVE_WORDS))
            neg_count += len(words.intersection(NEGATIVE_WORDS))
            if LAUGHTER_REGEX.search(t_lower):
                laughter_count += 1
            if "!" in m["message"] or m["message"].isupper():
                exclamations += 1

        total_analyzed = max(1, len(self.messages[-20:]))
        positivity = round(min(98.0, max(10.0, (pos_count / max(1, pos_count + neg_count)) * 100.0 if (pos_count + neg_count) > 0 else 50.0)), 1)
        tension = round(min(95.0, max(5.0, (neg_count / max(1, pos_count + neg_count)) * 100.0 if (pos_count + neg_count) > 0 else 15.0)), 1)
        laughter_score = round(min(95.0, max(0.0, (laughter_count / total_analyzed) * 100.0)), 1)

        # Hype calculated strictly from real incoming message velocity
        hype_index = round(min(99.0, max(0.0, velocity * 5.0 + exclamations * 6.0)), 1)

        if velocity == 0 and len(self.messages) == 0:
            dominant_emotion = "Mesaj Bekleniyor"
        elif hype_index > 65:
            dominant_emotion = "Yüksek Aktivite / Hype"
        elif laughter_score > 35:
            dominant_emotion = "Mizah / Gülme"
        elif tension > 45:
            dominant_emotion = "Gerilim / Şaşkınlık"
        elif positivity > 65:
            dominant_emotion = "Pozitif Reaksiyon"
        else:
            dominant_emotion = "Dengeli Akış"

        return {
            "messages": self.messages[-15:],
            "total_count": len(self.messages),
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
        if self.live_chat:
            try:
                self.live_chat.terminate()
            except Exception:
                pass
            self.live_chat = None
        self.is_connected = False

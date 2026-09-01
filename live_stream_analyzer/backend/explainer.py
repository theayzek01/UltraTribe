"""Scientific Cognitive Explainer for Real-Time Brain Activation Analysis."""
from __future__ import annotations

import typing as tp

def explain_brain_activity(
    activations: dict[str, float],
    sensory_metrics: dict[str, float],
) -> list[dict[str, tp.Any]]:
    """Generates precise technical reasons in Turkish explaining active cortical regions."""
    
    motion = sensory_metrics.get("motion_level", 0.0)
    faces = sensory_metrics.get("face_count", 0)
    scene_complexity = sensory_metrics.get("scene_complexity", 0.0)
    audio_loudness = sensory_metrics.get("audio_loudness", 0.0)
    speech_detected = sensory_metrics.get("speech_intensity", 0.0)
    
    explanations: list[dict[str, tp.Any]] = []

    # 1. Primary Visual Cortex (V1/V2)
    v1_score = activations.get("V1_V2", 20.0)
    if v1_score > 60.0:
        v1_reason = f"Görüntüde yüksek dinamizm ve optik akış ({motion:.1f}x hareket faktörü). Kenar, parlaklık ve kontrast geçişleri primer görsel retinotopik alanı yoğun uyardı."
    elif v1_score > 35.0:
        v1_reason = "Standart görsel bilgi akışı; sahne içi nesne hatları ve ışıma değişimleri işleniyor."
    else:
        v1_reason = "Durağan/karanlık kare; düşük optik hareket nedeniyle bazal uyarılma düzeyinde."
    explanations.append({
        "id": "V1_V2",
        "name": "Primer Görsel Korteks (V1/V2)",
        "score": v1_score,
        "category": "Görsel İşleme",
        "reason": v1_reason,
        "status": "Yüksek" if v1_score > 60 else ("Orta" if v1_score > 35 else "Düşük"),
    })

    # 2. Fusiform Face Area (FFA)
    ffa_score = activations.get("FFA", 10.0)
    if ffa_score > 65.0 or faces > 0:
        ffa_reason = f"Kamera kadrajında net insan yüzü / karakter algılandı ({faces} yüz tespit edildi). Fuziform girus yüz kimliği ve mimik analizine odaklandı."
    elif ffa_score > 35.0:
        ffa_reason = "İnsan benzeri form veya biyolojik hareket ipuçları ventral temporal yolakta yüz filtresini tetikledi."
    else:
        ffa_reason = "Kadrajda insan yüzü bulunmuyor; nöronlar bekleme durumunda."
    explanations.append({
        "id": "FFA",
        "name": "Fuziform Yüz Bölgesi (FFA)",
        "score": ffa_score,
        "category": "Karakter & Yüz",
        "reason": ffa_reason,
        "status": "Yüksek" if ffa_score > 60 else ("Orta" if ffa_score > 35 else "Düşük"),
    })

    # 3. Parahippocampal Place Area (PPA)
    ppa_score = activations.get("PPA", 15.0)
    if ppa_score > 60.0:
        ppa_reason = f"Geniş açılı mekan, çevre geometrisi veya dış ortam mimarisi saptandı ({scene_complexity:.1f}x çevre karmaşıklığı). Mekansal yönelim ağı devrede."
    else:
        ppa_reason = "Odak nesne/yakın plan üzerinde olduğu için arka plan mekan çözümlemesi arka planda tutuluyor."
    explanations.append({
        "id": "PPA",
        "name": "Mekan & Çevre Alanı (PPA)",
        "score": ppa_score,
        "category": "Mekansal Harita",
        "reason": ppa_reason,
        "status": "Yüksek" if ppa_score > 60 else ("Orta" if ppa_score > 35 else "Düşük"),
    })

    # 4. Auditory Cortex (A1/STG)
    a1_score = activations.get("A1_STG", 15.0)
    if a1_score > 65.0:
        a1_reason = f"Yüksek ses basıncı veya dinamik müzik spektrumu ({audio_loudness:.1f} dB bağıl seviye). Heschl girusunda frekans ayrışımı maksimumda."
    elif a1_score > 35.0:
        a1_reason = "Orta seviye ses akışı; konuşma ve fon sesleri tonotopik harita üzerinde filtreleniyor."
    else:
        a1_reason = "Düşük ses / sessizlik anı; işitsel korteks minimum aktivitede."
    explanations.append({
        "id": "A1_STG",
        "name": "Primer İşitsel Korteks (A1)",
        "score": a1_score,
        "category": "İşitsel Spektrum",
        "reason": a1_reason,
        "status": "Yüksek" if a1_score > 60 else ("Orta" if a1_score > 35 else "Düşük"),
    })

    # 5. Wernicke & Broca (Language Network)
    w_score = activations.get("Wernicke", 10.0)
    if w_score > 55.0 or speech_detected > 0.4:
        w_reason = "Aktif konuşma ve sözel anlatım algılandı. Sol temporal lobdaki Wernicke alanı duyulan kelimelerin anlamsal çözümlemesini yürütüyor."
    else:
        w_reason = "Doğrudan dil akışı tespit edilmedi; fonetik ve müzikal ögeler baskın."
    explanations.append({
        "id": "Wernicke",
        "name": "Wernicke Anlamsal Dil Alanı",
        "score": w_score,
        "category": "Dil Anlama",
        "reason": w_reason,
        "status": "Yüksek" if w_score > 55 else ("Orta" if w_score > 30 else "Düşük"),
    })

    # 6. Amygdala & Limbic Arousal
    amy_score = activations.get("Amygdala", 10.0)
    if amy_score > 60.0:
        amy_reason = "Ani görüntü geçişi, yüksek ses patlaması veya gerilim sinyali. Limbik sistem otonom uyarılma ve duygusal dikkat üretiyor."
    else:
        amy_reason = "Dengeli duygusal ton; tehlike veya ani şok uyarısı bulunmuyor."
    explanations.append({
        "id": "Amygdala",
        "name": "Amigdala & Duygu Merkezi",
        "score": amy_score,
        "category": "Duygusal Uyarılma",
        "reason": amy_reason,
        "status": "Yüksek" if amy_score > 60 else ("Orta" if amy_score > 30 else "Düşük"),
    })

    # Sort by score descending (most active brain regions on top)
    explanations.sort(key=lambda x: x["score"], reverse=True)
    return explanations

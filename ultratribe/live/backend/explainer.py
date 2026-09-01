"""Scientific Cognitive Explainer for Real-Time Brain Activation Analysis."""
from __future__ import annotations

import typing as tp

def explain_brain_activity(
    activations: dict[str, float],
    sensory_metrics: dict[str, float],
    chat_data: dict[str, tp.Any] | None = None,
) -> list[dict[str, tp.Any]]:
    """Generates precise technical reasons in Turkish explaining active cortical regions."""

    motion = sensory_metrics.get("motion_level", 0.0)
    faces = sensory_metrics.get("face_count", 0)
    scene_complexity = sensory_metrics.get("scene_complexity", 0.0)
    audio_loudness = sensory_metrics.get("audio_loudness", 0.0)
    speech_detected = sensory_metrics.get("speech_intensity", 0.0)
    
    chat_hype = chat_data.get("hype_index", 50.0) if chat_data else 50.0
    dominant_chat_mood = chat_data.get("sentiment", {}).get("dominant_emotion", "Dengeli") if chat_data else "Dengeli"

    explanations: list[dict[str, tp.Any]] = []

    # 1. Primary Visual Cortex (V1/V2)
    v1_score = activations.get("V1_V2", 20.0)
    if v1_score > 65.0:
        v1_reason = f"Görüntüde yüksek optik akış ve hızlı kamera hareketi ({motion:.1f}% dinamizm). Retinotopik V1/V2 alanı kenar ve kontrast frekanslarını işliyor."
    elif v1_score > 35.0:
        v1_reason = "Standart görsel bilgi akışı; sahne içi nesne konturları ve ışıma değişimleri filtreleniyor."
    else:
        v1_reason = "Durağan kadraj; primer görsel nöronlar bazal uyarılma seviyesinde."
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
        ffa_reason = f"Kamera kadrajında {faces} insan yüzü / karakter tespit edildi. Fuziform girus mimik ve yüz kimliği çözümlemesine kilitlendi."
    elif ffa_score > 35.0:
        ffa_reason = "İnsan benzeri form veya biyolojik hareket ipuçları ventral temporal yüz filtrelerini tetikledi."
    else:
        ffa_reason = "Kadrajda insan yüzü bulunmuyor; FFA nöronları bekleme modunda."
    explanations.append({
        "id": "FFA",
        "name": "Fuziform Yüz Alanı (FFA)",
        "score": ffa_score,
        "category": "Yüz & Karakter",
        "reason": ffa_reason,
        "status": "Yüksek" if ffa_score > 60 else ("Orta" if ffa_score > 35 else "Düşük"),
    })

    # 3. Parahippocampal Place Area (PPA)
    ppa_score = activations.get("PPA", 15.0)
    if ppa_score > 60.0:
        ppa_reason = f"Geniş açılı mekan veya çevre geometrisi saptandı ({scene_complexity:.1f}% mekan karmaşıklığı). Mekansal haritalama ağı aktif."
    else:
        ppa_reason = "Odak nesne/yakın planda olduğu için çevresel mekan derinliği arka planda tutuluyor."
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
        a1_reason = f"Yüksek ses basıncı ve zengin akustik spektrum ({audio_loudness:.1f} dB). Heschl girusunda frekans ayrışımı tepe noktada."
    elif a1_score > 35.0:
        a1_reason = "Dengeli işitsel girdi; fon sesleri ve diyalog tonotopik harita üzerinde ayrıştırılıyor."
    else:
        a1_reason = "Sessizlik/düşük ses anı; işitsel korteks minimum enerjide."
    explanations.append({
        "id": "A1_STG",
        "name": "Primer İşitsel Korteks (A1)",
        "score": a1_score,
        "category": "İşitsel Spektrum",
        "reason": a1_reason,
        "status": "Yüksek" if a1_score > 60 else ("Orta" if a1_score > 35 else "Düşük"),
    })

    # 5. Language Network (Wernicke)
    w_score = activations.get("Wernicke", 10.0)
    if w_score > 55.0 or speech_detected > 40.0:
        w_reason = "Aktif konuşma ve sözel diyalog saptandı. Sol temporal lob duyulan kelimelerin anlamsal kodlamasını yürütüyor."
    else:
        w_reason = "Sözel konuşma akışı tespit edilmedi; müzikal/çevresel sesler baskın."
    explanations.append({
        "id": "Wernicke",
        "name": "Wernicke Anlamsal Dil Alanı",
        "score": w_score,
        "category": "Dil Anlama",
        "reason": w_reason,
        "status": "Yüksek" if w_score > 55 else ("Orta" if w_score > 30 else "Düşük"),
    })

    # 6. Social Cognitive Network (TPJ) - Live Chat Feedback
    tpj_score = activations.get("TPJ_Social", 15.0)
    if tpj_score > 60.0 or chat_hype > 60.0:
        tpj_reason = f"Canlı chatte yoğun topluluk etkileşimi ve geri bildirim akışı (Topluluk Duygusu: {dominant_chat_mood}, {chat_hype:.1f}% Hype). Temporoparyetal kesişim sosyal bilişi yönetiyor."
    else:
        tpj_reason = "Topluluk etkileşimi stabil seyrediyor; sosyal biliş ağı bazal uyarılmada."
    explanations.append({
        "id": "TPJ_Social",
        "name": "Temporoparyetal Sosyal Biliş (TPJ)",
        "score": tpj_score,
        "category": "Sosyal Chat & Empati",
        "reason": tpj_reason,
        "status": "Yüksek" if tpj_score > 60 else ("Orta" if tpj_score > 35 else "Düşük"),
    })

    # 7. Amygdala & Limbic Arousal
    amy_score = activations.get("Amygdala", 10.0)
    if amy_score > 60.0:
        amy_reason = "Ani görüntü geçişi, yüksek ses patlaması veya chatte gerilim artışı. Limbik sistem otonom duygusal uyarılma üretiyor."
    else:
        amy_reason = "Dengeli duygusal ton; tehlike veya şok uyarısı bulunmuyor."
    explanations.append({
        "id": "Amygdala",
        "name": "Amigdala & Duygu Merkezi",
        "score": amy_score,
        "category": "Duygusal Uyarılma",
        "reason": amy_reason,
        "status": "Yüksek" if amy_score > 60 else ("Orta" if amy_score > 30 else "Düşük"),
    })

    # Sort descending by activation score
    explanations.sort(key=lambda x: x["score"], reverse=True)
    return explanations

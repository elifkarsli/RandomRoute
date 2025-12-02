// map.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, LatLng, Region } from "react-native-maps";

/** Türkiye yaklaşık sınır kutusu */
const TURKEY_BOUNDS = {
  southWest: { latitude: 35.8, longitude: 25.5 },
  northEast: { latitude: 42.5, longitude: 45.0 },
};
/** İçeri (kara) doğru çekeceğimiz referans nokta – ülkenin ortası */
const COUNTRY_CENTER: LatLng = { latitude: 39.0, longitude: 35.0 };

/** İlk kamera (Türkiye geneli) */
const INITIAL_REGION: Region = {
  latitude: (TURKEY_BOUNDS.southWest.latitude + TURKEY_BOUNDS.northEast.latitude) / 2,
  longitude: (TURKEY_BOUNDS.southWest.longitude + TURKEY_BOUNDS.northEast.longitude) / 2,
  latitudeDelta: 10.5,
  longitudeDelta: 12.5,
};

/**
 * İl merkezlerinden oluşan sade bir liste (kıyıdakiler de var).
 * Noktayı üretirken bu merkezleri ülke ortasına doğru biraz kaydırıp
 * rastgele gürültü ekleyerek “deniz yerine kara” olasılığını yükseltiyoruz.
 */
const CITY_CENTERS: LatLng[] = [
  { latitude: 39.9208, longitude: 32.8541 }, // Ankara
  { latitude: 41.0151, longitude: 28.9795 }, // İstanbul
  { latitude: 38.4237, longitude: 27.1428 }, // İzmir
  { latitude: 37.0000, longitude: 35.3213 }, // Adana
  { latitude: 36.8969, longitude: 30.7133 }, // Antalya
  { latitude: 37.8713, longitude: 32.4846 }, // Konya
  { latitude: 38.7312, longitude: 35.4787 }, // Kayseri
  { latitude: 39.7506, longitude: 37.0150 }, // Sivas
  { latitude: 39.9043, longitude: 41.2679 }, // Erzurum
  { latitude: 37.9144, longitude: 40.2306 }, // Diyarbakır
  { latitude: 37.0662, longitude: 37.3833 }, // Gaziantep
  { latitude: 37.7742, longitude: 38.2763 }, // Adıyaman
  { latitude: 37.1674, longitude: 38.7955 }, // Şanlıurfa
  { latitude: 38.3552, longitude: 38.3095 }, // Malatya
  { latitude: 40.1950, longitude: 29.0600 }, // Bursa
  { latitude: 39.9208, longitude: 32.8541 }, // Ankara (tekrar, iç dağılım için sorun değil)
  { latitude: 40.8438, longitude: 31.1565 }, // Düzce
  { latitude: 40.9833, longitude: 27.5167 }, // Tekirdağ
  { latitude: 40.6083, longitude: 43.1000 }, // Kars
  { latitude: 40.6000, longitude: 43.4167 }, // Ardahan
  { latitude: 40.1467, longitude: 26.4086 }, // Çanakkale
  { latitude: 39.6472, longitude: 27.8861 }, // Balıkesir
  { latitude: 40.5833, longitude: 36.5667 }, // Tokat
  { latitude: 41.2867, longitude: 36.33   }, // Samsun
  { latitude: 40.6500, longitude: 35.8333 }, // Amasya
  { latitude: 38.6743, longitude: 34.8556 }, // Nevşehir
  { latitude: 39.5481, longitude: 34.9533 }, // Kırıkkale
  { latitude: 37.7648, longitude: 29.0884 }, // Denizli
  { latitude: 38.4622, longitude: 27.2176 }, // Manisa
  { latitude: 37.2153, longitude: 28.3636 }, // Muğla (kıyı – içe çekeceğiz)
  { latitude: 40.1569, longitude: 26.4142 }, // Gelibolu
  { latitude: 40.65,   longitude: 29.27   }, // Yalova
  { latitude: 38.7348, longitude: 41.4893 }, // Muş
  { latitude: 39.1167, longitude: 39.5333 }, // Tunceli
  { latitude: 39.7191, longitude: 43.0503 }, // Iğdır
  { latitude: 41.0053, longitude: 39.7269 }, // Trabzon (kıyı)
  { latitude: 36.8000, longitude: 34.6333 }, // Mersin (kıyı)
  { latitude: 38.3552, longitude: 31.4167 }, // Isparta
  { latitude: 37.8667, longitude: 32.4833 }, // Karaman
];

/** Kutuda kalacak şekilde kırp */
function clampToBounds({ latitude, longitude }: LatLng): LatLng {
  return {
    latitude: Math.max(TURKEY_BOUNDS.southWest.latitude,
              Math.min(latitude, TURKEY_BOUNDS.northEast.latitude)),
    longitude: Math.max(TURKEY_BOUNDS.southWest.longitude,
               Math.min(longitude, TURKEY_BOUNDS.northEast.longitude)),
  };
}

/**
 * Şehir merkezinden ülke ortasına doğru hafif bir vektör + küçük rastgele sapma.
 * coastal şehirlerde noktayı kıyıdan karaya doğru iter, denize düşmeyi azaltır.
 */
function randomInlandNearCity(): LatLng {
  const base = CITY_CENTERS[Math.floor(Math.random() * CITY_CENTERS.length)];

  // Ülke merkezine doğru vektör (normalize edilmemiş)
  const toCenter = {
    lat: COUNTRY_CENTER.latitude - base.latitude,
    lng: COUNTRY_CENTER.longitude - base.longitude,
  };

  // 0.0–0.35 arası ölçekle “içe çekme”
  const pull = (0.15 + Math.random() * 0.20);
  const inward = { lat: toCenter.lat * pull, lng: toCenter.lng * pull };

  // Şehir çevresine ±(0.05–0.25) derece rastgele gürültü
  const jitterScale = 0.05 + Math.random() * 0.20;
  const jitter = {
    lat: (Math.random() - 0.5) * jitterScale,
    lng: (Math.random() - 0.5) * jitterScale,
  };

  const candidate = {
    latitude: base.latitude + inward.lat + jitter.lat,
    longitude: base.longitude + inward.lng + jitter.lng,
  };

  return clampToBounds(candidate);
}

/** İstasyon listesini tek sefer üret (uygulama her açıldığında değişir) */
function useRandomStations(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `st-${i}-${Math.random().toString(36).slice(2, 8)}`,
        coord: randomInlandNearCity(),
      })),
    [count]
  );
}

export default function MapScreen() {
  const stations = useRandomStations(60); // istediğin kadar arttır/azalt

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {stations.map((s) => <Marker key={s.id} coordinate={s.coord} />)}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});

/**
 * PULSE Location & Geotagging Service
 * Zero-Cost, Ultra-Fast Geolocation & Nearby Engine
 */

export const POPULAR_LOCATIONS = [
  // Egypt - Capital & Major Districts
  { name: 'القاهرة، مصر', nameEn: 'Cairo, Egypt', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0444, lng: 31.2357 },
  { name: 'الزمالك، القاهرة', nameEn: 'Zamalek, Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0631, lng: 31.2185 },
  { name: 'المعادي، القاهرة', nameEn: 'Maadi, Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 29.9599, lng: 31.2585 },
  { name: 'التجمع الخامس، القاهرة الجديدة', nameEn: 'Fifth Settlement, New Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0074, lng: 31.4294 },
  { name: 'مدينة نصر، القاهرة', nameEn: 'Nasr City, Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0566, lng: 31.3301 },
  { name: 'مصر الجديدة، القاهرة', nameEn: 'Heliopolis, Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0911, lng: 31.3213 },
  { name: 'وسط البلد، القاهرة', nameEn: 'Downtown, Cairo', city: 'القاهرة', cityEn: 'Cairo', country: 'مصر', lat: 30.0489, lng: 31.2384 },
  { name: 'الشيخ زايد، الجيزة', nameEn: 'Sheikh Zayed, Giza', city: 'الجيزة', cityEn: 'Giza', country: 'مصر', lat: 30.0494, lng: 30.9856 },
  { name: '6 أكتوبر، الجيزة', nameEn: '6th of October, Giza', city: 'الجيزة', cityEn: 'Giza', country: 'مصر', lat: 29.9737, lng: 30.9593 },
  { name: 'الدقي والمهندسين، الجيزة', nameEn: 'Dokki & Mohandessin, Giza', city: 'الجيزة', cityEn: 'Giza', country: 'مصر', lat: 30.0384, lng: 31.2114 },
  { name: 'الإسكندرية، مصر', nameEn: 'Alexandria, Egypt', city: 'الإسكندرية', cityEn: 'Alexandria', country: 'مصر', lat: 31.2001, lng: 29.9187 },
  { name: 'ستانلي وكورنيش الإسكندرية', nameEn: 'Stanley & Corniche, Alexandria', city: 'الإسكندرية', cityEn: 'Alexandria', country: 'مصر', lat: 31.2355, lng: 29.9489 },
  { name: 'المنصورة، الدقهلية', nameEn: 'Mansoura, Egypt', city: 'المنصورة', cityEn: 'Mansoura', country: 'مصر', lat: 31.0409, lng: 31.3785 },
  { name: 'طنطا، الغربية', nameEn: 'Tanta, Egypt', city: 'طنطا', cityEn: 'Tanta', country: 'مصر', lat: 30.7865, lng: 31.0004 },
  { name: 'بورسعيد، مصر', nameEn: 'Port Said, Egypt', city: 'بورسعيد', cityEn: 'Port Said', country: 'مصر', lat: 31.2653, lng: 32.3019 },
  { name: 'الإسماعيلية، مصر', nameEn: 'Ismailia, Egypt', city: 'الإسماعيلية', cityEn: 'Ismailia', country: 'مصر', lat: 30.5965, lng: 32.2715 },
  { name: 'السويس، مصر', nameEn: 'Suez, Egypt', city: 'السويس', cityEn: 'Suez', country: 'مصر', lat: 29.9668, lng: 32.5498 },
  { name: 'شرم الشيخ، سيناء', nameEn: 'Sharm El Sheikh, Egypt', city: 'شرم الشيخ', cityEn: 'Sharm El Sheikh', country: 'مصر', lat: 27.9158, lng: 34.3299 },
  { name: 'الغردقة، البحر الأحمر', nameEn: 'Hurghada, Egypt', city: 'الغردقة', cityEn: 'Hurghada', country: 'مصر', lat: 27.2579, lng: 33.8116 },
  { name: 'الأقصر وأسوان، مصر', nameEn: 'Luxor & Aswan, Egypt', city: 'الأقصر', cityEn: 'Luxor', country: 'مصر', lat: 25.6872, lng: 32.6396 },

  // Arab & Global Hubs
  { name: 'الرياض، السعودية', nameEn: 'Riyadh, Saudi Arabia', city: 'الرياض', cityEn: 'Riyadh', country: 'السعودية', lat: 24.7136, lng: 46.6753 },
  { name: 'جدة، السعودية', nameEn: 'Jeddah, Saudi Arabia', city: 'جدة', cityEn: 'Jeddah', country: 'السعودية', lat: 21.5433, lng: 39.1728 },
  { name: 'دبي، الإمارات', nameEn: 'Dubai, UAE', city: 'دبي', cityEn: 'Dubai', country: 'الإمارات', lat: 25.2048, lng: 55.2708 },
  { name: 'أبوظبي، الإمارات', nameEn: 'Abu Dhabi, UAE', city: 'أبوظبي', cityEn: 'Abu Dhabi', country: 'الإمارات', lat: 24.4539, lng: 54.3773 },
  { name: 'الدوحة، قطر', nameEn: 'Doha, Qatar', city: 'الدوحة', cityEn: 'Doha', country: 'قطر', lat: 25.2854, lng: 51.5310 },
  { name: 'مدينة الكويت، الكويت', nameEn: 'Kuwait City, Kuwait', city: 'الكويت', cityEn: 'Kuwait City', country: 'الكويت', lat: 29.3759, lng: 47.9774 },
  { name: 'عمان، الأردن', nameEn: 'Amman, Jordan', city: 'عمان', cityEn: 'Amman', country: 'الأردن', lat: 31.9454, lng: 35.9284 },
  { name: 'بغداد، العراق', nameEn: 'Baghdad, Iraq', city: 'بغداد', cityEn: 'Baghdad', country: 'العراق', lat: 33.3152, lng: 44.3661 },
  { name: 'لندن، المملكة المتحدة', nameEn: 'London, UK', city: 'لندن', cityEn: 'London', country: 'المملكة المتحدة', lat: 51.5074, lng: -0.1278 },
  { name: 'نيويورك، الولايات المتحدة', nameEn: 'New York, USA', city: 'نيويورك', cityEn: 'New York', country: 'الولايات المتحدة', lat: 40.7128, lng: -74.0060 },
];

/**
 * Haversine Formula to calculate distance between two coordinates in kilometers.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the nearest known preset location for given coordinates.
 */
export function findNearestPresetLocation(lat, lng) {
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const loc of POPULAR_LOCATIONS) {
    const dist = calculateDistance(lat, lng, loc.lat, loc.lng);
    if (dist !== null && dist < minDistance) {
      minDistance = dist;
      nearest = { ...loc, distanceKm: dist };
    }
  }

  return nearest;
}

export const locationService = {
  /**
   * Get real device geolocation coordinates via browser/device GPS.
   */
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your device'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  },

  /**
   * Fast reverse geocode:
   * First tries nearest known preset; if within 20km, uses it immediately without network.
   * Otherwise queries OpenStreetMap Nominatim for human-friendly place name.
   */
  async reverseGeocode(lat, lng, lang = 'ar') {
    const nearest = findNearestPresetLocation(lat, lng);
    if (nearest && nearest.distanceKm <= 20) {
      return {
        name: lang === 'ar' ? nearest.name : nearest.nameEn,
        city: lang === 'ar' ? nearest.city : nearest.cityEn,
        country: nearest.country,
        lat,
        lng,
        distanceKm: nearest.distanceKm
      };
    }

    // Try OpenStreetMap Nominatim (Zero cost, public API)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${lang === 'ar' ? 'ar,en' : 'en'}`,
        { headers: { 'User-Agent': 'PULSE-Social-App/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        const district = address.suburb || address.neighbourhood || address.quarter || address.city_district || '';
        const city = address.city || address.town || address.state || '';
        const country = address.country || '';

        const nameParts = [district, city, country].filter(Boolean);
        const fullName = nameParts.length > 0 ? nameParts.slice(0, 2).join('، ') : data.display_name?.split(',')[0];

        return {
          name: fullName || (lang === 'ar' ? 'موقعي الحالي' : 'Current Location'),
          city: city || district,
          country,
          lat,
          lng
        };
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode notice:', err);
    }

    // Fallback to nearest preset if any
    if (nearest) {
      return {
        name: lang === 'ar' ? nearest.name : nearest.nameEn,
        city: lang === 'ar' ? nearest.city : nearest.cityEn,
        lat,
        lng
      };
    }

    return {
      name: lang === 'ar' ? 'موقعي الحالي' : 'Current Location',
      city: '',
      lat,
      lng
    };
  },

  /**
   * Search locations (preset database + optional online query)
   */
  searchLocations(query, lang = 'ar') {
    if (!query || !query.trim()) {
      return POPULAR_LOCATIONS.slice(0, 8);
    }

    const q = query.trim().toLowerCase();
    return POPULAR_LOCATIONS.filter((loc) => {
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.nameEn.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.cityEn.toLowerCase().includes(q) ||
        loc.country.toLowerCase().includes(q)
      );
    });
  },

  /**
   * Parse user's profile location string into a matching location object
   */
  parseProfileLocation(profileLocStr) {
    if (!profileLocStr || typeof profileLocStr !== 'string') return null;
    const cleanStr = profileLocStr.trim().toLowerCase();
    
    // Check in presets
    const match = POPULAR_LOCATIONS.find((loc) => {
      return (
        cleanStr.includes(loc.city.toLowerCase()) ||
        cleanStr.includes(loc.cityEn.toLowerCase()) ||
        cleanStr.includes(loc.name.toLowerCase()) ||
        cleanStr.includes(loc.nameEn.toLowerCase())
      );
    });

    if (match) {
      return {
        name: match.name,
        nameEn: match.nameEn,
        city: match.city,
        cityEn: match.cityEn,
        lat: match.lat,
        lng: match.lng
      };
    }

    return {
      name: profileLocStr.trim(),
      city: profileLocStr.split(',')[0].trim(),
      lat: null,
      lng: null
    };
  },

  /**
   * Calculate relevance/distance score of a post to the user
   */
  getProximityScore(post, userLocation) {
    if (!post?.location || !userLocation) return 0;

    const postLoc = typeof post.location === 'object' ? post.location : { name: post.location };
    const userLoc = typeof userLocation === 'object' ? userLocation : this.parseProfileLocation(userLocation);

    // Coordinate match
    if (postLoc.lat && postLoc.lng && userLoc?.lat && userLoc?.lng) {
      const dist = calculateDistance(postLoc.lat, postLoc.lng, userLoc.lat, userLoc.lng);
      if (dist !== null) {
        if (dist <= 15) return 100; // Same neighborhood
        if (dist <= 50) return 80;  // Same city/governorate
        if (dist <= 150) return 50; // Nearby region
        if (dist <= 500) return 25; // Same country
        return Math.max(5, 100 - Math.round(dist / 20));
      }
    }

    // Textual fuzzy match
    const pName = (postLoc.name || '').toLowerCase();
    const pCity = (postLoc.city || '').toLowerCase();
    const uName = (userLoc?.name || userLoc?.nameEn || '').toLowerCase();
    const uCity = (userLoc?.city || userLoc?.cityEn || '').toLowerCase();

    if (uCity && (pCity.includes(uCity) || pName.includes(uCity))) return 85;
    if (uName && (pName.includes(uName) || uName.includes(pName))) return 80;

    return 10;
  }
};

// Offline police-station directory (prototype, runnable, no GPS/IP).
// Kiosk preset > manual district/PS select. Coordinates optional for future haversine.
// Full state-wise list is a data-entry task; this file proves the runnable pattern.
export const PS_DIRECTORY = [
    { state: 'Telangana', district: 'Warangal', ps: 'Hanamkonda PS', phone: '0870-2560133' },
    { state: 'Telangana', district: 'Hyderabad', ps: 'Saifabad PS', phone: '040-23234001' },
    { state: 'Maharashtra', district: 'Mumbai', ps: 'Colaba PS', phone: '022-22852846' },
    { state: 'Maharashtra', district: 'Pune', ps: 'Shivajinagar PS', phone: '020-25531000' },
    { state: 'Tamil Nadu', district: 'Chennai', ps: 'Mylapore PS', phone: '044-24950000' },
    { state: 'West Bengal', district: 'Kolkata', ps: 'Park Street PS', phone: '033-22268321' },
    { state: 'Karnataka', district: 'Bengaluru', ps: 'Cubbon Park PS', phone: '080-22861234' },
    { state: 'Kerala', district: 'Kochi', ps: 'Central PS Kochi', phone: '0484-2352800' },
    { state: 'Delhi', district: 'New Delhi', ps: 'Connaught Place PS', phone: '011-23361100' },
    { state: 'Uttar Pradesh', district: 'Lucknow', ps: 'Hazratganj PS', phone: '0522-2235759' },
];

const KIOSK_KEY = 'nyaya_setu_kiosk_ps_v1';

export function getDistricts() {
    return [...new Set(PS_DIRECTORY.map((r) => r.district))].sort();
}
export function getStationsForDistrict(district) {
    return PS_DIRECTORY.filter((r) => r.district === district);
}
export function getKioskPS() {
    try { return localStorage.getItem(KIOSK_KEY) || ''; } catch { return ''; }
}
export function setKioskPS(psName) {
    try { if (psName) localStorage.setItem(KIOSK_KEY, psName); else localStorage.removeItem(KIOSK_KEY); } catch { /* ignore */ }
}

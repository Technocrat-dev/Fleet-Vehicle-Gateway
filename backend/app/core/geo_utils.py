"""
Geospatial Utilities

Shared geometry helpers used by both the geofencing API and the
real-time GeofenceService.
"""


def point_in_polygon(lat: float, lng: float, polygon: dict) -> bool:
    """
    Check if a point is inside a GeoJSON polygon using the ray-casting algorithm.

    Args:
        lat: Latitude of the point.
        lng: Longitude of the point.
        polygon: GeoJSON Polygon dict (``{"type": "Polygon", "coordinates": [...]}``)

    Returns:
        True if the point lies inside the polygon, False otherwise.
    """
    if polygon.get("type") != "Polygon":
        return False

    coordinates = polygon.get("coordinates", [[]])
    if not coordinates or not coordinates[0]:
        return False

    ring = coordinates[0]  # Outer ring
    n = len(ring)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]  # lng, lat in GeoJSON
        xj, yj = ring[j][0], ring[j][1]

        if ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / (yj - yi) + xi
        ):
            inside = not inside
        j = i

    return inside

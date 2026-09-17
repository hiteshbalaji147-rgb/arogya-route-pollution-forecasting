from math import radians, sin, cos, sqrt, atan2


EARTH_RADIUS = 6371000  # meters


def haversine_distance(lat1, lon1, lat2, lon2):

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return EARTH_RADIUS * c

def sample_route_points(
    geometry,
    sample_distance=1000,
    max_points=5
):

    # Google Routes emits a LineString; accept MultiLineString too for stored data.
    if geometry and isinstance(geometry[0][0], (int, float)):
        geometry = geometry
    elif geometry:
        geometry = [point for line in geometry for point in line]

    sampled_points = []

    previous = None

    accumulated = 0
    

    for coordinate in geometry:

        lon, lat = coordinate

        if previous is None:

            sampled_points.append(
                (lat, lon)
            )

            previous = (lat, lon)

            continue

        distance = haversine_distance(
            previous[0],
            previous[1],
            lat,
            lon
        )

        accumulated += distance

        if accumulated >= sample_distance:

            sampled_points.append(
                (lat, lon)
            )

            accumulated = 0

        previous = (lat, lon)

    if geometry:
        last = (geometry[-1][1], geometry[-1][0])
        if not sampled_points or sampled_points[-1] != last:
            sampled_points.append(last)
    if len(sampled_points) > max_points:
        indices = [round(index * (len(sampled_points) - 1) / (max_points - 1)) for index in range(max_points)]
        sampled_points = [sampled_points[index] for index in indices]
    return sampled_points

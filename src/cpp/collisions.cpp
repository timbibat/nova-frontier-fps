// src/cpp/collisions.cpp
extern "C" {
    // 1. Check if a point (e.g. laser projectile) collides with a bounding sphere
    bool check_sphere_collision(
        float px, float py, float pz,
        float sx, float sy, float sz,
        float radius
    ) {
        float dx = px - sx;
        float dy = py - sy;
        float dz = pz - sz;
        float distSq = dx*dx + dy*dy + dz*dz;
        return distSq <= (radius * radius);
    }

    // 2. Check if two capsules (e.g. players/bots) are overlapping horizontally and vertically
    bool check_capsule_collision(
        float p1x, float p1y, float p1z,
        float p2x, float p2y, float p2z,
        float radius, float height
    ) {
        float dx = p1x - p2x;
        float dz = p1z - p2z;
        float distSq = dx*dx + dz*dz;
        
        if (distSq > (radius * 2) * (radius * 2)) {
            return false;
        }

        float dy = p1y - p2y;
        float absDy = dy < 0 ? -dy : dy;
        return absDy < height;
    }
}

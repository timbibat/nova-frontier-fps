// src/cpp/weapons.cpp
#include <math.h>

extern "C" {
    // 1. Verify if a target coordinate is within a weapon's maximum absolute firing or melee range
    bool check_weapon_range(
        float p1x, float p1y, float p1z,
        float p2x, float p2y, float p2z,
        float max_range
    ) {
        float dx = p1x - p2x;
        float dy = p1y - p2y;
        float dz = p1z - p2z;
        float distSq = dx*dx + dy*dy + dz*dz;
        return distSq <= (max_range * max_range);
    }

    // 2. Calculate 3D Projectile velocity by rotating default forward (0, 0, -1) by quaternion (qx, qy, qz, qw)
    float get_velocity_x(float qx, float qy, float qz, float qw, float speed) {
        return -2.0f * (qw * qy + qx * qz) * speed;
    }

    float get_velocity_y(float qx, float qy, float qz, float qw, float speed) {
        return 2.0f * (qw * qx - qy * qz) * speed;
    }

    float get_velocity_z(float qx, float qy, float qz, float qw, float speed) {
        return (qx*qx + qy*qy - qz*qz - qw*qw) * speed;
    }

    // 3. Calculate world coordinates of muzzle offset in camera space
    float get_muzzle_pos_x(
        float cam_x, float cam_y, float cam_z,
        float qx, float qy, float qz, float qw,
        float lx, float ly, float lz
    ) {
        // Rotate local offset (lx, ly, lz) by quaternion (qx, qy, qz, qw)
        float tx = 2.0f * (qy * lz - qz * ly);
        float tz = 2.0f * (qx * ly - qy * lx);
        float ty = 2.0f * (qz * lx - qx * lz);
        return cam_x + (lx + qw * tx + qy * tz - qz * ty);
    }

    float get_muzzle_pos_y(
        float cam_x, float cam_y, float cam_z,
        float qx, float qy, float qz, float qw,
        float lx, float ly, float lz
    ) {
        float tx = 2.0f * (qy * lz - qz * ly);
        float ty = 2.0f * (qz * lx - qx * lz);
        float tz = 2.0f * (qx * ly - qy * lx);
        return cam_y + (ly + qw * ty + qz * tx - qx * tz);
    }

    float get_muzzle_pos_z(
        float cam_x, float cam_y, float cam_z,
        float qx, float qy, float qz, float qw,
        float lx, float ly, float lz
    ) {
        float tx = 2.0f * (qy * lz - qz * ly);
        float ty = 2.0f * (qz * lx - qx * lz);
        float tz = 2.0f * (qx * ly - qy * lx);
        return cam_z + (lz + qw * tz + qx * ty - qy * tx);
    }

    // 4. Calculate real-time linear damage falloff based on target range
    float get_weapon_damage_with_falloff(float dist, float max_range, float base_damage) {
        if (dist > max_range) {
            return 0.0f;
        }
        float ratio = dist / max_range;
        return base_damage * (1.0f - ratio * 0.7f);
    }
}

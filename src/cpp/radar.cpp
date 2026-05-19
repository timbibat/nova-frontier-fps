// src/cpp/radar.cpp
#include <math.h>

extern "C" {
    // 1. Calculate target absolute horizontal distance
    float get_radar_dist(float tx, float tz, float mx, float mz) {
        float dx = tx - mx;
        float dz = tz - mz;
        return sqrtf(dx * dx + dz * dz);
    }

    // 2. Transform world coordinates to radar percentage left (X-axis, where 50 is center)
    float get_radar_left(
        float tx, float tz, 
        float mx, float mz, 
        float cos_yaw, float sin_yaw, 
        float max_range
    ) {
        float dx = tx - mx;
        float dz = tz - mz;
        float dist = sqrtf(dx * dx + dz * dz);

        // Transform absolute world coordinate delta by player's rotation
        float rx = dx * cos_yaw - dz * sin_yaw;
        
        float display_x = rx;
        if (dist > max_range && dist > 0.0f) {
            display_x = rx * (max_range / dist);
        }
        
        return 50.0f + (display_x / max_range) * 50.0f;
    }

    // 3. Transform world coordinates to radar percentage top (Y-axis, where 50 is center)
    float get_radar_top(
        float tx, float tz, 
        float mx, float mz, 
        float cos_yaw, float sin_yaw, 
        float max_range
    ) {
        float dx = tx - mx;
        float dz = tz - mz;
        float dist = sqrtf(dx * dx + dz * dz);

        // Transform absolute world coordinate delta by player's rotation
        float ry = dx * sin_yaw + dz * cos_yaw;
        
        float display_y = ry;
        if (dist > max_range && dist > 0.0f) {
            display_y = ry * (max_range / dist);
        }
        
        return 50.0f + (display_y / max_range) * 50.0f;
    }

    // 4. Calculate rotation degrees for arrow display (pointing direction)
    float get_radar_rotation(
        float tx, float tz, 
        float mx, float mz, 
        float cos_yaw, float sin_yaw,
        float max_range
    ) {
        float dx = tx - mx;
        float dz = tz - mz;
        float dist = sqrtf(dx * dx + dz * dz);

        float rx = dx * cos_yaw - dz * sin_yaw;
        float ry = dx * sin_yaw + dz * cos_yaw;

        float display_x = rx;
        float display_y = ry;
        if (dist > max_range && dist > 0.0f) {
            display_x = rx * (max_range / dist);
            display_y = ry * (max_range / dist);
        }

        // Convert angle from radians to degrees and add standard arrow offset
        float angle = atan2f(display_y, display_x);
        return angle * (180.0f / 3.14159265f) + 90.0f;
    }
}

-- Run this once in phpMyAdmin (Hostinger hPanel > Databases > phpMyAdmin)
-- after creating the database.

CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  month TINYINT NOT NULL,
  year SMALLINT NOT NULL,
  body TEXT,
  cover VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy flat gallery. Still read for trips created before ordered blocks.
CREATE TABLE IF NOT EXISTS trip_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  filename VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ordered content blocks: an interleaved sequence of text and images.
CREATE TABLE IF NOT EXISTS trip_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  type ENUM('text','image') NOT NULL,
  text TEXT,
  filename VARCHAR(120),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 27, 2024 at 06:04 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `stripe_customer`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `subscription_id` varchar(255) DEFAULT NULL,
  `active_abonnement` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `email`, `stripe_customer_id`, `subscription_id`, `active_abonnement`) VALUES
(66, 'Rahim Tawani', 'Rahim.tawani@gmail.com', 'cus_QjqLUqhxtwczxK', NULL, 0),
(67, 'Max Well', 'Well.max@gmail.com', 'cus_QjXvGCjSD7YgYT', NULL, 0),
(69, 'Ahmadzai Walizadah', 'admin.ahmad@gmail.com', 'cus_QjSOCTNu8UCPl3', NULL, 0),
(70, 'Abdulghafar Begie', 'Begie.Ghafar@gmail.com', 'cus_QjROJyJgWVGYtI', NULL, 0),
(71, 'Jimmy Willson', 'willson.Jimmy@gmail.com', 'cus_QjRNDpc7nkvGzA', NULL, 0),
(101, 'John Delinger', 'delinger.John@gmail.com', 'cus_QjRNsDIdSlWInF', 'sub_1PsRMuIC80XBakK1uN97UnPE', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

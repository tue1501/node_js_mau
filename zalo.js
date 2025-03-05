import axios from 'axios';

const accessToken = 'MVTl5T8tY4MVTl5T8tMVTl5T8tY4PJzcCJspI8JbFrOXZRB-SIBhuD4kTdamG_oX85_rEj2txUE5cfHwPHUy8DOuflxt9tuWjzgdBiBoFM3G2k5uaJTgqKBheJ_W0njq5I-ZdSRWYiFd7I6hqXMvTP7g4RfoGWg3uog0IfPYQ90cVOCPzXAfSDASmcZNWvX1aknoYv9nk5MJFCESTa6eL3RvCft7X3wbfbbN_0OLNFAas_NvLGNk8N0jTSyYCdcb1szWdDItlCHaUKVy5LQViWNuLbgbzqq0CFcr6zFskSFZs77OOxHvzW5hmkyHTkYneSkXcC9d6Z2nQnOPS7MDGR9QaOh79shZSak2xNBcsGHogoCzObEfz2DCK5s0jEn643TdUvzDDbr2sEGmY4PJzcCJspI8JbFrOXZRB-SIBhuD4kTdamG_oX85_rEj2txUE5cfHwPHUy8DOuflxt9tuWjzgdBiBoFM3G2k5uaJTgqKBheJ_W0njq5I-ZdSRWYiFd7I6hqXMvTP7g4RfoGWg3uog0IfPYQ90cVOCPzXAfSDASmcZNWvX1aknoYv9nk5MJFCESTa6eL3RvCft7X3wbfbbN_0OLNFAas_NvLGNk8N0jTSyYCdcb1szWdDItlCHaUKVy5LQViWNuLbgbzqq0CFcr6zFskSFZs77OOxHvzW5hmkyHTkYneSkXcC9d6Z2nQnOPS7MDGR9QaOh79shZSak2xNBcsGHogoCzObEfz2DCK5s0jEn643TdUvzDDbr2sEGmPJzcCJspI8JbFrOXZRB-SIBhuD4kTdamG_oX85_rEj2txUE5cfHwPHUy8DOuflxt9tuWjzgdBiBoFM3G2k5uaJTgqKBheJ_W0njq5I-ZdSRWYiFd7I6hqXMvTP7g4RfoGWg3uog0IfPYQ90cVOCPzXAfSDASmcZNWvX1aknoYv9nk5MJFCESTa6eL3RvCft7X3wbfbbN_0OLNFAas_NvLGNk8N0jTSyYCdcb1szWdDItlCHaUKVy5LQViWNuLbgbzqq0CFcr6zFskSFZs77OOxHvzW5hmkyHTkYneSkXcC9d6Z2nQnOPS7MDGR9QaOh79shZSak2xNBcsGHogoCzObEfz2DCK5s0jEn643TdUvzDDbr2sEGm'; 
const recipientId = '1840805594930426838';  // Thay bằng Zalo ID của người nhận

const messageData = {
  recipient: {
    oid: recipientId  // Zalo ID của người nhận
  },
  message: {
    text: 'Chào bạn, đây là thông báo từ Zalo OA của chúng tôi!'  // Nội dung tin nhắn
  }
};

axios.post('https://openapi.zalo.me/v2.0/oa/message', messageData, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // Thêm access token
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Thông báo đã được gửi:', response.data);
})
.catch(error => {
  console.error('Có lỗi xảy ra khi gửi thông báo:', error);
});

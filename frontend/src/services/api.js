import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export const studentAPI = {
  addStudent: async (data) => {
    const form = new FormData();
    form.append('name', data.name);
    form.append('email', data.email);
    form.append('phone', data.phone);
    form.append('dob', data.dob);
    form.append('photo', data.photo);
    const res = await api.post('/students/', form);
    return res.data;
  },

  getStudents: async () => {
    const res = await api.get('/students/');
    return Array.isArray(res.data) ? res.data : (res.data.students || []);
  },

  deleteStudent: async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },

  recognizeFace: async (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    const res = await api.post('/recognize/', form);
    return res.data;
  },
};

export default api;
